import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { mongoose } from "mongoose";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Tweet content is required");
  }

  const tweetCreated = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tweetCreated, "Tweet Successfully created"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "channel id is required");
  }

  const allTweet = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, allTweet, "user tweet are feteched"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

 const updatedtweet= await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: req.body.content,
      },
    },
    { new: true }
  );


  res.status(200).json(new ApiResponse(200,updatedtweet,"Tweet has updated"))
});


const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

 await Tweet.findByIdAndDelete(tweetId
  );


  res.status(200).json(new ApiResponse(200,"Tweet has deleted"))
});

export { 
    createTweet, 
    getUserTweets,
    updateTweet,
    deleteTweet
 };
