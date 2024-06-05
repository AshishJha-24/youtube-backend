import { Video } from "../models/video.model.js";
import { PlayList } from "../models/playList.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import getPublicIdfromLink from "../utils/getPublicIdfromLink.js";
import { Comment } from "../models/comment.model.js";
import { Subscription } from "../models/subscription.model.js";


async function removeLikesCommentsPlaylistWatchHistoryForVideo(videoId) {
  try {
    //Delete all likes for the video
    const LikesDelete = await Like.deleteMany({ video: videoId });

    const getComments = await Comment.find({ video: videoId });

    const commentsIds = getComments.map(comment=> comment._id);

    //Delete likes for the comments
    const commentLikeDelete = await Like.deleteMany({
      comment: { $in: commentsIds },
    });

    // Delte all comments for the video
    const commentDelete = await Comment.deleteMany({
      video: videoId,
    });

    //Remove video from playlist
    const playlistDelete = await PlayList.updateMany(
      {},
      { $pull: { videos: videoId } }
    );

    await Promise.all([
      LikesDelete,
      commentLikeDelete,
      commentDelete,
      playlistDelete,
    ]);

    return true;
  } catch (error) {
    console.error(
      "Error deleting likes, comments , playlist entries, and watch history for videos: ",
      error
    );
    throw error;
  }
}



const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const pageNumber = parseInt(page);
  const pageSize = parseInt(limit);
  const skip = (pageNumber - 1) * pageSize;

  const pipeline = [];

  if (query) {
    pipeline.push({
      $search: {
        index: "videosearch",
        text: {
          query: query,
          path: ["title", "description"], // Search in only title and description
        },
      },
    });
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avtar: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        ownerDetails: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: pageSize,
    }
  );

  const video = await Video.aggregate(pipeline);

  res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched Successfully "));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished } = req.body;
 

  if (!title || !description || !isPublished) {
    throw new ApiError(400, "All fields are required");
  }

 let publish;
 if(isPublished==='true'){
  publish=true
 }else{
  publish=false
 }
  const localPathofVideo = req?.files?.video[0].path;
  console.log(localPathofVideo);
  if (!localPathofVideo) {
    throw new ApiError(400, "video file is required");
  }

  let localPathofThumbnail;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    localPathofThumbnail = req?.files?.thumbnail[0]?.path;
  }

  const video = await uploadOnCloudinary(localPathofVideo);
  const thumbnail = await uploadOnCloudinary(localPathofThumbnail);

  if (!video) {
    throw new ApiError(500, "Something went wrong while uploading video ");
  }

  const uploadVideo = await Video.create({
    videoFile: video?.url,
    thumbnail: thumbnail?.url || "",
    title,
    description,
    duration: video?.duration,
    isPublished:publish,
    owner: req?.user._id,
  });

  res
    .status(200)
    .json(new ApiResponse(200, uploadVideo, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
 
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  const videoById = await Video.findById(videoId);

  if (!videoById) {
    throw new ApiError(404,"Video not found");
  }

  const video = await Video.aggregate([
    {$match:{
      _id: new mongoose.Types.ObjectId(videoId),
    }},
    {
      $lookup:{
        from:"users",
        localField:"owner",
        foreignField:"_id",
        as:"ownerDetails",
        pipeline:[
        {

            $project:{
              password:0,
              accessToken:0,
              refreshToken:0,
              watchHistory:0
            }
          }
        ]
      }
    },
    {
      $lookup:{
        from:"likes",
        foreignField:"video",
        localField:"_id",
        as:"likesOnvideo",
        pipeline:[
          {
            $addFields:{
              
            }
          }
        ]
      }
    },
    
    
    {
      $addFields:{
       ownerDetails:{
        $first:"$ownerDetails"
       },
       likes:{
        $size:"$likesOnvideo"
       },
       isLiked:{
        $cond:{
          if:{
            $in:[ req.user?._id, "$likesOnvideo.likedBy"]
          },
          then:true,
          else:false
        }
       }
      }
    },
    {
      $project:{
        likesOnvideo:0
      }
    }
  ])
  if (!video) {
    throw new ApiError(404, "Video not Found");
  }

   const isSubscribed=await Subscription.aggregate([
    {
      $match:{
        channel:video[0].ownerDetails._id,
      }
    },
    {
      $group:{
        _id:"$channel", // Group key
        subscribers:{ $addToSet :"$subscriber" },
        
      }
    },
    {
     $addFields:{
      isSubscribed:{
        $cond:{
          if:{
            $in:[req.user._id,"$subscribers"]
          },
          then:true,
        else:false
        },
        
      },
      subscriberCount:{
        $size:"$subscribers"
      }
     }
    },{
      $project:{
        isSubscribed:1,
        subscriberCount:1,
      }
    }
    
   ])

   console.log(isSubscribed)
   if(isSubscribed.length>0){
 video[0].isSubscribed=isSubscribed[0].isSubscribed;
   video[0].subscriberCount=isSubscribed[0].subscriberCount;
   }
   
  
  

  const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const videoIndex = user.watchHistory.indexOf(videoId);
    if (videoIndex !== -1) {
      // If it exists, remove it
      user.watchHistory.splice(videoIndex, 1);
    }

    // Add the videoId to the beginning of the history array
    user.watchHistory.unshift(videoId);

    // Save the updated user document
   const addedVideoToHistory= await user.save({ validateBeforeSave: false });

  
if(!addedVideoToHistory){
  throw new ApiError(500,"unable to add video to hitory");
}

videoById.views += 1;
await videoById.save();

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video is fetched successfully "));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const { title, description } = req.body;
  const newThumbnailPath = req.file?.path;

  if (!title?.trim() && !description?.trim()) {
    throw new ApiError(400, "Title and description is required");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(200, "Video not found");
  }

  if (req.user?._id.toString() !== video.owner.toString()) {
    throw new ApiError(400, "Only owner can update");
  }

  let updatedVideoDetail;

  if (!newThumbnailPath) {
    updatedVideoDetail = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
        },
      },
      {
        new: true,
      }
    );
  } else {
    const newThumbnail = await uploadOnCloudinary(newThumbnailPath);
    if (!newThumbnail) {
      throw new ApiError(500, "Unable to upload thumbail");
    }
    const oldThumbnail = video.thumbnail;

    updatedVideoDetail = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: newThumbnail.url,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedVideoDetail) {
      throw new ApiError(500, "unable to update video details");
    }
    const publicIdThumbnail = getPublicIdfromLink(oldThumbnail);
    await deleteFromCloudinary(publicIdThumbnail);
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideoDetail,
        "Details are successfully updated"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
 
  
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid Object");
  }

 const isVideo = await Video.findById(videoId);

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !isVideo.isPublished,
      },
    },
    {
      new: true,
    }
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video, "video status updated Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video Id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.owner.toString() === req.user._id.toString()) {
    throw new ApiError(401, "only owner can delete the video");
  }

  const deleteVideo = await Video.findByIdAndDelete(videoId);

  if (!deleteVideo) {
    throw new ApiError(404, "Failed to delete the video");
  }

  const deletelikes =
    await removeLikesCommentsPlaylistWatchHistoryForVideo(videoId);

  if (!deletelikes) {
    throw new ApiError(400, "Failed to delete likes and comment for video");
  }

  const publicIdOfVideo = getPublicIdfromLink(deleteVideo.videoFile);
  const publicIdOfThumbnail = getPublicIdfromLink(deleteVideo.thumbnail);

  await deleteFromCloudinary(publicIdOfVideo, "video");
  await deleteFromCloudinary(publicIdOfThumbnail);

  res.status(200).json(new ApiResponse(200, null, "Video deleted"));
});

export {
  publishVideo,
  getVideoById,
  updateVideo,
  togglePublishStatus,
  deleteVideo,
  getAllVideos,
  
};
