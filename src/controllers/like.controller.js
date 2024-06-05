import mongoose, { isValidObjectId } from "mongoose";
import {Like}  from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleVideoLikes = asyncHandler(async (req, res)=>{
      const  {videoId} = req.params;
      const userId = req.user?._id;
      if(!userId){
        throw new ApiError(400,"You must be logged in to like the video");
      }

      if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId");
      }

       const alreadyLiked = await Like.findOne({
        video:videoId,
        likedBy:userId
       })

       if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id);

    return    res.status(200).json(new ApiResponse(200,{isLiked:false},"Unliked the video"));
       }

       await Like.create({
        video:videoId,
        likedBy:userId
       })

     return  res.status(200).json(new ApiResponse(200,{isLiked:true},"video Liked"));


})



const toggleCommentLikes = asyncHandler(async (req, res)=>{
      const  {commentId} = req.params;
      const userId = req.user?._id;
      if(!userId){
        throw new ApiError(400,"You must be logged in to like the comment");
      }

      if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid commentId");
      }

       const alreadyLiked = await Like.findOne({
        comment:commentId,
        likedBy:userId
       })

       if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id);

     return   res.status(200).json(new ApiResponse(200,{isLiked:false},"Unliked the comment"));
       }

       await Like.create({
        comment:commentId,
        likedBy:userId
       })

      return res.status(200).json(new ApiResponse(200,{isLiked:true},"comment Liked"));


})



const toggleTweetLikes = asyncHandler(async (req, res)=>{
      const  {tweetId} = req.params;
      const userId = req.user?._id;
      if(!userId){
        throw new ApiError(400,"You must be logged in to like the tweet");
      }

      if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet Id");
      }

       const alreadyLiked = await Like.findOne({
        tweet:tweetId,
        likedBy:userId
       })

       if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked._id);

        return res.status(200).json(new ApiResponse(200,{isLiked:false},"Unliked the tweet"));
       }

       await Like.create({
        tweet:tweetId,
        likedBy:userId
       })

      return res.status(200).json(new ApiResponse(200,{isLiked:true},"tweet Liked"));


})


const getLikedVideos= asyncHandler(async ( req, res)=>{
      const userId = req.user?._id;
      if(!userId){
        throw new ApiError(400,"Login first to watch liked videos");
      }

      const allLikedVideos = await Like.aggregate([
        {
            $match:{
                likedBy:userId
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails",
                            
                        }
                    },
                    {
                        $addFields:{
                          ownerDetails:{
                            $first:"$ownerDetails"
                           }
                        }
                    }
                    
                ]
            }
        },

        {
            $addFields:{
             likedVideos:{
                $first:"$likedVideos"
             }
            }
        },
        {
          $match:{
            "likedVideos.isPublished":true
          }
       },{
            $sort:{
                createdAt:-1
            },
        },
        {
            $project: {
                _id: 0,
                likedVideos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        avtar: 1,
                    },
                },
            },
        },
        {
            $match: {
             likedVideos: { $exists: true },
        }
    }
        
      ])

      if (!allLikedVideos) {
        throw new ApiError(400, "No Liked videos found")
    }

      res.status(200).json(new ApiResponse(200,allLikedVideos,"feteched Liked videos"));


})



export {
    toggleVideoLikes,
    toggleCommentLikes,
    toggleTweetLikes,
    getLikedVideos

}



