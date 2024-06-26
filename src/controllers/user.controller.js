import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary ,deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import getPublicIdfromLink from "../utils/getPublicIdfromLink.js";
import jwt from "jsonwebtoken";
import mongoose, { isValidObjectId } from "mongoose";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went worng while genrating access and refresh tokens"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user detials from frontend
  // validation - not empty
  //check if user already exits
  //check for images , check avatar
  //upload them to cloudinary
  //create user object - create entry in db
  // remove id and refresh token
  //responses
  // check for user creation
  // return res

  const { username, email, fullName, password } = req.body || {};

  // Check if any required field is missing
  if (!username || !email || !fullName || !password) {
    throw new ApiError(400, "All fields are required");
  }
  if (
    [username, email.fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fileds should be non-empty");
  }

  const exitedUser = await User.findOne({ $or: [{ email }, { username }] });

  if (exitedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avtarLocalPath = req.files?.avtar[0]?.path;

  // const coverImageLocalPath=req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avtarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avtar = await uploadOnCloudinary(avtarLocalPath);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avtar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    avtar: avtar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password  -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while creating the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body->data
  // username or email login
  //find the user
  //password check
  //access and refresh token
  // send cookies
  const { username, email, password } = req.body;

  console.log(username, email, password );

  if (!username && !email) {
    throw new ApiError(400, "username or passowrd is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  console.log(user);

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const ispasswordValid = await user.isPasswordCorrect(password);

  if (!ispasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const logedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure:true
  };

 

 res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: logedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodeToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodeToken._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh Token");
    }

    if (incommingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh tokenis expired or used");
    }

    const { accessToken, newRefreshToken } = generateAccessAndRefereshTokens(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fectched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password ");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    new ApiError(400, "avatar files is missing");
  }
  const userWitholdAvatar = await User.findById(req.user?._id);

  const pulbicId = getPublicIdfromLink(userWitholdAvatar.avtar);


  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    new ApiError(400, "error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avtar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

         await deleteFromCloudinary(pulbicId);

  res.status(200).json(new ApiResponse(200, user, "Avatar is  updated"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    new ApiError(400, "coverImage files is missing");
  }

  const userWitholdCoverImage = await User.findById(req.user?._id);

  const pulbicId = getPublicIdfromLink(userWitholdCoverImage.coverImage);

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    new ApiError(400, "error while uploading on coverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  await deleteFromCloudinary(pulbicId);

  res.status(200).json(new ApiResponse(200, user, "CoverImage updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if(!isValidObjectId(userId)){
    throw new ApiError(404,"invalid userId");
  }

  const channel = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        avtar: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exit");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user.id),
      },
    },
    {
      $project: {
        watchHistory: 1,
      },
    },
    {
      $unwind: '$watchHistory',
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistoryDetails',
      },
    },
    {
      $unwind: '$watchHistoryDetails',
    },
    {
      $match:{
        "watchHistoryDetails.isPublished":true,
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'watchHistoryDetails.owner',
        foreignField: '_id',
        as: 'watchHistoryDetails.ownerDetails',
      },
    },
    {
      $addFields: {
        'watchHistoryDetails.ownerDetails': {
          $first: '$watchHistoryDetails.ownerDetails',
        },
      },
    },
    {
      $group: {
        _id: '$_id',
        watchHistory: { $push: '$watchHistoryDetails' },
      },
    },
    {
      $project: {
        'watchHistory.ownerDetails.password': 0, // Exclude sensitive fields if necessary
      },
    }
    
  ]);


console.log(user)
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch History fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
