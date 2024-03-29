import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

  if (!username && !email) {
    throw new ApiError(400, "username or passowrd is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

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
    secure: true,
  };

  return res
    .status(200)
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
      $set: {
        refreshToken: undefined,
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



const refreshAccessToken=asyncHandler(async (req,res)=>{
  const incommingRefreshToken = req.cookies.refreshToken  || req.body.refreshToken;

  if(!incommingRefreshToken){
    throw new ApiError(401,"unauthorized request");
  }
try {
  const decodeToken=jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
  
       const user = await User.findById(decodeToken._id);
  
       if(!user){
        throw new ApiError(401,"invalid refresh Token");
       }
  
  
       if(incommingRefreshToken!==user.refreshToken){
        throw new ApiError(401,"Refresh tokenis expired or used");
       }
    
       const { accessToken, newRefreshToken }= generateAccessAndRefereshTokens(user._id);
  
       const options={
        httpOnly:true,
        secure:true
       }
  
       return res.status(200)
       .cookie("accessToken",accessToken,options)
       .cookie("refreshToken",newRefreshToken)
        .json(new ApiResponse(200,{
          accessToken,
          refreshToken:newRefreshToken
        },
        "Access token refreshed"
        ))
} catch (error) {
  throw new ApiError(401,error?.message|| "Invalid refresh Token");
}
})




export {
   registerUser,
    loginUser,
     logoutUser,
    refreshAccessToken };
