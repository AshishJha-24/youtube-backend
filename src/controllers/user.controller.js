import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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

export { registerUser };
