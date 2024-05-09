import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  // Check if avatar is even given or not
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload on Cloudinary if all values are validated
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // check if the avatar uploding on cloudinary was done successfully
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Everything checked so create a user
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Here we are excluding passwor dand refreshToken from the frontend (server side) as the don't need access to it. So we are only sending all the other data in the user Object except password and refreshtoken.
  const createdUser = await User.findById(user._id).select(
    // This is a wierd syntax for exlcluding something as if you see all the fields are selected by default so you are deselecting them.
    "-password -refreshToken"
  );

  // Error if th user was not created
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return user data after excluding the user data that you don't want to send to front end
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

// Generate Access and Refresh Tokens
// later called in the loginUser
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // Make sure when you are callin the custom written methods you are using smaller case as that is not a mongoose or mongoDb method
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Adding refresh token into the user
    user.refreshToken = refreshToken;
    // We are setting the validation to false as we know the user is already validated
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens"
    );
  }
};

// Login User

// Get username and password from the user
// Validate the given fields
// Check if the username matches with any existing user.
// Decrypt the password and check if it's same or not.
// If everything is correct then give the user an Access Token & Refresh Token.
// send cookie
// And then navigate to the home page with authentication being true.

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  // When you set these option this will make sure that the cookie is not modifiable from frontend and can only be modified by the backend
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,
      {
        user: loggedInUser, accessToken, refreshToken
      },
      "User logged In Successfully"
    )
  )

});

// Logout User

const logoutUser = asyncHandler(async (req, res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      // returns the new value of the user which has refreshToken undefined
      new: true
    }
  )

  // Clear cookies
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User successfully logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401, "Unauthorized request")
  }

try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
    const user = await User.findOne(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401, "Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
  
    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
    return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", newRefreshToken)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed successfully"
      )
    )
} catch (error) {
  throw new ApiError(401, error?.message || "Invalid refresh token")
}

})

export { registerUser, loginUser, logoutUser, refreshAccessToken };
