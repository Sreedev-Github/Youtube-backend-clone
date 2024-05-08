import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Get user details from frontend
// Validation is done both on frontend and backend
// Check if user already exists: username & email
// Check for images, check for avatar
// If available upload them to cloudinary, avatar
// create user object - create entry in db
// remove password and refresh token field from response
// Remove password and refresh token field from response
// Check for user creation
// return res

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  // console.log(req.body);

  // Validation
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // Does user already exists?
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  // Error if user already exists
  if (existedUser) {
    throw new ApiError(
      409,
      "User with the email or username is already registered"
    );
  }
  // console.log(req.files);

  // Get local path for both avatar and coverImage
  const avatarLocalPath = req.files?.avatar[0]?.path;
  
  let coverImageLocalPath;
  // Check if coverImage is even given or not
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLocalPath = req.files.coverImage[0].path
  }

  // Check if avatar is even given or not
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload on Cloudinary if all values are validated
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check if the avatar uploding on cloudinary was done successfully
  if(!avatar){
    throw new ApiError(400, "Avatar file is required");
  }

  // Everything checked so create a user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });

  // Here we are excluding passwor dand refreshToken from the frontend (server side) as the don't need access to it. So we are only sending all the other data in the user Object except password and refreshtoken.
  const createdUser = await User.findById(user._id).select(
    // This is a wierd syntax for exlcluding something as if you see all the fields are selected by default so you are deselecting them.
    "-password -refreshToken"
  )

  // Error if th user was not created 
  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  // return user data after excluding the user data that you don't want to send to front end
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
  )

});

export { registerUser };
