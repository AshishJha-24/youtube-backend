import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import  {Like} from "../models/like.model.js";
import {Subscription}  from "../models/subscription.model.js"
import {User} from "../models/user.model.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";



const getChannelStats= asyncHandler(async (req,res)=>{
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user._id;

    if(!userId){
        throw new ApiError(400,"Login is required");
    }

    const allVideos=await Video.aggregate([
        {
            $match:{
                owner:new mongoose.Types.ObjectId(userId)
            }
        },
        
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as: "likes",
            },
            
        },
        {
            $addFields:{
                totalLikesofthevideo:{
                    $size:"$likes"
                }
            }
        },
        {
            $group:{
                _id:"$owner",
              totallikes:{
                $sum:"$totalLikesofthevideo"
              },
              totalViews:{
                $sum:"$views"
              },
               totalVideos:{
                $sum:1
               }
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"Subscriber"
            }
        },
        {
        $addFields:{
            totalSubscriber:{
                $size:"$Subscriber"
            }
        }
    },
    {
        $project:{
            Subscriber:0
        }
    }

    ])

    res.status(200).json(new ApiResponse(200,allVideos,"successfully"));
    

})


const getChannelVideos=asyncHandler(async (req, res)=>{
     // TODO: Get all the videos uploaded by the channel

     const userId = req.user._id;
     if(!userId){
        throw new ApiError(400,"User is not found")
     }

     const allvideos = await Video.aggregate([
        {
            $match:{
                owner:userId
            }
        },{
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            }
        },
        {
            $addFields:{
                totalLikes:{
                    $size:"$likes"
                },
                 createdAt: {
                        $dateToParts: { date: "$createdAt" }
                    }
                }
        },
        {
           $sort:{
            createdAt:-1
           }
        },
        {
            $project:{
                likes:0,
                duration:0,
                videoFile:0,
               createdAt: {
                  hour:0,
                  minute:0,
                  second:0,
                  millisecond:0
                },
                updatedAt:0
            }
        }
     ])

res.status(200).json(new ApiResponse(200,allvideos,"Feteched all video successfull"));
})



export {
    getChannelStats,
    getChannelVideos
}
