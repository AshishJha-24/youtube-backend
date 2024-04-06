import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {uploadOnCloudinary}  from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const publishVideo=asyncHandler(async (req,res)=>{
      
  const {title,description,isPublished}=req.body;

  if(!title || !description || !isPublished){
    throw new ApiError(400,"All fields are required");
  }

   const localPathofVideo =req?.files?.video[0].path;
   if(!localPathofVideo){
    throw new ApiError(400,"video file is required");
   }

   let localPathofThumbnail;
   if (
     req.files &&
     Array.isArray(req.files.thumbnail) &&
     req.files.thumbnail.length > 0
   ) {
     localPathofThumbnail =req?.files?.thumbnail[0].path;
   }


   const video= await uploadOnCloudinary(localPathofVideo);
   const thumbnail = await uploadOnCloudinary(localPathofThumbnail);

   if(!video){
      throw new ApiError(500,"Something went wrong while uploading video ");
   }
  
const uploadVideo=await Video.create({
    videoFile:video?.url,
    thumbnail:thumbnail?.url || "",
    title,
    description,
    duration:video?.duration,
    isPublished,
    owner:req?.user._id
});



   res.status(200).json(new ApiResponse(200,uploadVideo,"Video uploaded successfully"));


})

export {
    publishVideo,
}