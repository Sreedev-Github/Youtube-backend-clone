import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

// Upload a video

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description, isPublished = true } = req.body;

  if (!(title?.trim() && description?.trim())) {
    throw new ApiError(400, "Please provide all the required data");
  }

  const videoLocalPath = req.files?.video[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is missing");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);

  if (!videoFile.url) {
    throw new ApiError(400, "Error while uploading video");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is missing");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  const addVideo = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    isPublished,
    owner: req.user._id,
    videoPublicId: videoFile.public_id,
    thumbnailPublicId: thumbnail.public_id,
  });

  if (!addVideo) {
    throw new ApiError(500, "Some error while uploading to the database");
  }

  const video = await Video.findById(addVideo._id).select("-thumbnailPublicId -videoPublicId")

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video has been uploaded successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(401, "No video was found for deletion");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "No video found to delete");
  }

  console.log(video.publicId);

  await cloudinary.uploader
    .destroy(video.videoPublicId, { resource_type: "video" })
    .then((result) => console.log(result));

  await cloudinary.uploader
    .destroy(video.thumbnailPublicId, { resource_type: "image" })
    .then((result) => console.log(result));

  const deletedVideo = await Video.findByIdAndDelete(videoId).select("-thumbnailPublicId -videoPublicId")

  res.status(200).json(new ApiResponse(200, { deletedVideo }));
});

export { uploadVideo, deleteVideo };

// video : {
//     asset_id: '62787ede28e2c23d3af55b2690b56e1a',
//     public_id: 'qpdwftidxx0dhnpzrk9f',
//     version: 1715431464,
//     version_id: 'cc98692d52375d999eb5f12b6c484fdd',
//     signature: 'b039da08a09e0268e3c80bb115f2d6a136580fd9',
//     width: 1080,
//     height: 1920,
//     format: 'mp4',
//     resource_type: 'video',
//     created_at: '2024-05-11T12:44:24Z',
//     tags: [],
//     pages: 0,
//     bytes: 18968203,
//     type: 'upload',
//     etag: '897b36bb7d3e00ea6bbf17a3e59d8b54',
//     placeholder: false,
//     url: 'http://res.cloudinary.com/sreedev/video/upload/v1715431464/qpdwftidxx0dhnpzrk9f.mp4',
//     secure_url: 'https://res.cloudinary.com/sreedev/video/upload/v1715431464/qpdwftidxx0dhnpzrk9f.mp4',
//     playback_url: 'https://res.cloudinary.com/sreedev/video/upload/sp_auto/v1715431464/qpdwftidxx0dhnpzrk9f.m3u8',
//     folder: '',
//     audio: {},
//     video: {
//       pix_format: 'yuv420p',
//       codec: 'h264',
//       level: 40,
//       profile: 'High',
//       bit_rate: '5408853',
//       time_base: '1/25'
//     },
//     frame_rate: 25,
//     bit_rate: 5411755,
//     duration: 28.04,
//     rotation: 0,
//     original_filename: '7565438-hd_1080_1920_25fps',
//     nb_frames: 701,
//     api_key: '448964677232843'
//   }

// Thumbnail:  {
//     asset_id: 'a4488893ae0a677c00604323c94f237c',
//     public_id: 'apriycenr1zqf84qzvuy',
//     version: 1715431525,
//     version_id: 'c5e608f218fcd084f0529a222863f9b2',
//     signature: '0beedff43c7579483975328300c3104987652279',
//     width: 6000,
//     height: 4000,
//     format: 'jpg',
//     resource_type: 'image',
//     created_at: '2024-05-11T12:45:25Z',
//     tags: [],
//     bytes: 895024,
//     type: 'upload',
//     etag: 'e4483adeb386972acb397dfedc0a68c3',
//     placeholder: false,
//     url: 'http://res.cloudinary.com/sreedev/image/upload/v1715431525/apriycenr1zqf84qzvuy.jpg',
//     secure_url: 'https://res.cloudinary.com/sreedev/image/upload/v1715431525/apriycenr1zqf84qzvuy.jpg',
//     folder: '',
//     original_filename: 'pexels-pixabay-355235',
//     api_key: '448964677232843'
//   }
