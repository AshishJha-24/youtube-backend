import mongoose, { isValidObjectId } from "mongoose";
import {Subscription} from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user?._id;

    if(!userId){
        throw new ApiError(400,"You are not authorized to subscribe ");
    }

    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel Id");
    }

    const alreadySubscribed = await Subscription.findOne({
       channel:channelId,
       subscriber:userId  
    })

    if(alreadySubscribed){
        await Subscription.findByIdAndDelete(alreadySubscribed?._id);

        return res.status(200).json(new ApiResponse(200,{subscribed:false},"unsubscribed successfully"));
    }

    const subscribed = await Subscription.create({
        channel:channelId,
        subscriber:userId
    })

    if(!subscribed){
        throw new ApiError(500,"Unable to subscribe");
    }

    return res.status(200).json(new ApiResponse(200,{subscribed:true},"Subscribed successfully"));
})


// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;
    const userId = req.user?._id;

     if(!userId){
        throw new ApiError(400,"Invalid user Id ");
     }

    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel Id")
    }

    if(channelId?.toString()!==userId?.toString()){
        throw new ApiError(400,"User can only see their own subscriber list")
    }

    const getSubscriber = await Subscription.aggregate([
        {
            $match:{
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
              from:"users",
              localField:"subscriber",
              foreignField:"_id",
              as:"Channelsubscriber",
              pipeline:[
                {
                    $lookup:{
                        from:"subscriptions",
                        localField:"_id",
                        foreignField:"channel",
                        as:"subscribedToSubscriber"
                    }
                },

                {
                    $addFields: {
                        subscribedToSubscriber: {
                            $cond: {
                                if: {
                                    $in: [
                                        userId,
                                        "$subscribedToSubscriber.subscriber",
                                    ],
                                },
                                then: true,
                                else: false,
                            },
                        },
                        subscribersCount: {
                            $size: "$subscribedToSubscriber",
                        },
                    },
                },
              ]
            }
          },
          {
            $addFields:{
                Channelsubscriber:{
                    $first:"$Channelsubscriber"
                }
            }
          },
          
         
    ])


    res.status(200).json(new ApiResponse(200,getSubscriber,"Successfully fetched all subscriber list"))
})



// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

      const userId = req.user?._id;
      if(!userId){
        throw new ApiError(400,"You are not authorized");
      }

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid subscriber Id");
    }

    if(subscriberId.toString()!==userId.toString()){
        throw new ApiError(400,"you can't see other user subscribed channel list");
    }

    const subscribedChannelList= await  Subscription.aggregate([
        {
            $match:{
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscribedChannel",
                pipeline:[
                    {
                        $lookup:{
                            from:"videos",
                            localField:"_id",
                            foreignField:"owner",
                            as:"videos"
                        }
                    },
                    {
                        $addFields:{
                            latestVideo:{
                                $last:"$videos"
                            }
                        }
                    }
                ]
            }
        },
        {
          $addFields:{
            subscribedChannel:{
                $first:"$subscribedChannel"
            }
          }   
        },{
            $project:{
                
                subscribedChannel:{
                    _id:1,
                    username:1,
                    fullName:1,
                    avtar:1,
                    latestVideo:{
                        _id:1,
                        videoFile:1,
                        thumbnail:1,
                        owner:1,
                        title:1,
                        description:1,
                        duration:1,
                        createdAt:1,
                        views:1
                    }
                }
            }
        }
    ])



    res.status(200).json(new ApiResponse(200,subscribedChannelList,"successfully feteched subscribed channel"));




})






export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
    
}