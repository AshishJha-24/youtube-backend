import { isValidObjectId, mongoose } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

//get all comment of the video

const getVideoComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = parseInt(page);
  const limitofComment = parseInt(limit);
  const skip = (pageNumber - 1) * limitofComment;
  const pageSize = limitofComment;
  if (!videoId) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not foudn");
  }

  const allComment = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "commentOwner",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "commentLikes",
      },
    },
    {
      $addFields: {
        commentLikesCount: {
          $size: "$commentLikes",
        },
        commentOwner: {
          $fist: "$commentOwenr",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$commentLikes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: pageSize,
    },
  ]);

  if (!allComment) {
    throw new ApiError(404, "no comment found ");
  }

  res
    .status(200)
    .json(new ApiResponse(200, allComment, "comments retrived successfully"));
});

// add comment
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) {
    throw new ApiError(500, "Unable to create comment");
  }

  res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment is successfully created"));
});

//update comment
const updateComment = asyncHandler(async (req, res) => {
  const commentId = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  if (!content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }


  const comment = await Comment.findById(commentId);
  if(!comment){

    throw new ApiError(404,"comment not found");

  }
  if (comment.owner.toString() !== req.user?._id) {
    throw new ApiError(400, "can not update other comment");
  }

  const updatedComment = await Comment.findByIdAndUpdate(commentId,{
    $set:{
    content
  }},{
    new:true
  })

  if(!updatedComment){
    throw new ApiError(500,"Failed to update comment");
  }

  res.status(200).json(new ApiResponse(200,updatedComment,"Comment successfully updated"))
  
});



//delete Comment

const deleteComment=asyncHandler(async(req,res)=>{
    const {commentId} = req.params;

    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid comment Id");
    }

    const comment = await Comment.aggregate([
        {
            $match:{
                _id:new mongoose.Types.objectId(commentId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as :"videoOwner"
            }
        },{
            $addFields:{
                videoOwner:{
                    $first:"$videoOwner"
                }
            }
        }
    ]);

    if(comment.length===0){
        throw new ApiError(404,"Comment not found");
    }

    if(comment[0].owner.toString()!==req.user._id && comment[0].videoOwner.owner.toString()!==req.user._id){
        throw new ApiError(400,"Your are unanthorized to delete this comment");
    }


    const deletedComment =await Comment.findByIdAndDelete(commentId);


    res.status(200).json(new ApiResponse(200,deletedComment,"Comment succesfully deleted"));
})

export { addComment, getVideoComment, updateComment,deleteComment };
