import { v2 as cloudinary } from "cloudinary";
// FS = File System comes by default by node helps with handeling of files.
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath)
      return console.error(
        "Could not find the local file path for Cloudinary file Upload"
      );

    // Upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // After file uploaded successfullyS
    fs.unlinkSync(localFilePath)
    // console.log(response);
    return response;

  } catch (error) {
    fs.unlinkSync(localFilePath) // Remove the locally saved temporary file as the file upload operation got failed
    return null;
  }
};


export {uploadOnCloudinary}