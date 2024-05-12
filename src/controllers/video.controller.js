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

  if (!req.files) {
    throw new ApiError(401, "Please upload a video and thumbnail");
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

  const video = await Video.findById(addVideo._id).select(
    "-thumbnailPublicId -videoPublicId"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video has been uploaded successfully"));
});

// Delete a video

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

  // Delete video and thumbnail from cloudinary
  await cloudinary.uploader
    .destroy(video.videoPublicId, { resource_type: "video" })
    .then((result) => console.log(result));

  await cloudinary.uploader
    .destroy(video.thumbnailPublicId, { resource_type: "image" })
    .then((result) => console.log(result));

  const deletedVideo = await Video.findByIdAndDelete(videoId).select(
    "-thumbnailPublicId -videoPublicId"
  );

  res.status(200).json(new ApiResponse(200, { deletedVideo }));
});

// get video by ID

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Please provide a vaid ID");
  }

  const video = await Video.findById(videoId).select(
    "-videoPublicId -thumbnailPublicId"
  );

  if (!video) {
    throw new ApiError(404, "Video was not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video has been fetched successfully"));
});

// Update Video

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(404, "No video was found");
  }

  const oldVideo = await Video.findById(videoId);

  const { title, description, isPublished } = req.body;

  if (!(title && description && isPublished)) {
    throw new ApiError(400, "Please fill every field");
  }

  let newThumbnail;

  if (req.file && req.file.path) {
    const newThumbnailPath = req.file.path;

    newThumbnail = await uploadOnCloudinary(newThumbnailPath);
  }

  // Create a update obeject to pass in the update method later
  const updateObject = {
    $set: {
      title,
      description,
      isPublished,
    },
  };

  // Add thumbnail and thumbnailPublicId only if it has been passed
  if (newThumbnail?.url) {
    updateObject.$set.thumbnail = newThumbnail.url;
    updateObject.$set.thumbnailPublicId = newThumbnail.public_id;
  }

  const updatedVideo = await Video.findByIdAndUpdate(videoId, updateObject, {
    new: true,
  }).select("-videoPublicId -thumbnailPublicId");

  if (!updatedVideo) {
    throw new ApiError(500, "There was some error while updating the video1");
  }

  // Delete old thumbnail from cloudinary
  if (newThumbnail?.url !== oldVideo.thumbnail) {
    await cloudinary.uploader
      .destroy(oldVideo.thumbnailPublicId, { resource_type: "image" })
      .then((result) => console.log(result));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video has been updated successfully")
    );
});

// Get all Videos
const getAllVideos = asyncHandler(async (req, res) => {
  const allVidoes = await Video.find({});

  if (!allVidoes) {
    throw new ApiError(500, "Error while fetching all videos");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, allVidoes, "All vidoes fetched successfully"));
});

// Toggle Publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  console.log(req.body);

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: req.body.isPublished,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "Your video's published status has been updated successfully"
      )
    );
});

export {
  uploadVideo,
  deleteVideo,
  getVideoById,
  updateVideo,
  getAllVideos,
  togglePublishStatus,
};
