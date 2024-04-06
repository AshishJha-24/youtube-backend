import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET
});


const uploadOnCloudinary=async (localFilePath)=>{
       try{
        if(!localFilePath) return null;
        //upload the file on cloudinary
       const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })

        //file has been uploaded successfull
       fs.unlinkSync(localFilePath);

        return response;

       }catch(error){
           fs.unlinkSync(localFilePath)  //remove the locally saved temporarty file as teh upload operation got failder

           return null;
       }
}

const deleteFromCloudinary =async(publicId)=>{
  if(!publicId){
    return null;
  }

  const deletedAsset=await cloudinary.uploader.destroy(publicId,function(error,result){
    if(error){
      console.error("unable to delete from cloudinary " ,error);
    }
    else{
      console.log("successfully deleted ",result );
    }
  })
}




export {uploadOnCloudinary,deleteFromCloudinary}