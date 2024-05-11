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

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // When you set these option this will make sure that the cookie is not modifiable from frontend and can only be modified by the backend
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
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

// Logout User

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      // returns the new value of the user which has refreshToken undefined
      new: true,
    }
  );

  // Clear cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User successfully logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findOne(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Password Change
const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  // Verify if the user is logged in using authMiddleware (jwt)

  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(401, "New password and confirm passwords doesn't match");
  }

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  // The password hashing will run right before save as it has been modified and if you see in user model we have used user.pre
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Get current user

const getCurrentUser = asyncHandler(async (req, res) => {
  // You can do this as well but it's just taking more time so why not send the user directly in the response as we have user in the auth.middleware already injedcted into req.body.user
  // const user = await User.findById(req.body.user?._id)

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // If you want to update user files then make another endpoint for it as it is unneccesary for us to send the whole data over and over again when he/she just want to change account details or images.

  const { fullName, email, username } = req.body;

  if (!(fullName || email || username)) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        username,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

// Update avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
  // we aren't using req.files and instead using req.file as we are only accepting one image
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  // TODO: Delete old image

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// Update Cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover Image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// getUserChannelProfile

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // Aggregation
  // Returns array
  const channel = await User.aggregate([
    {
      // Match and find the user based on username.
      $match: {
        username: username?.toLowerCase(),
      },
    },
    // Finding all the documents in which a channel is present as it will be serving as the number of documents which has subscribed to the user channel.
    {
      // We give the model name which is going to be saved in mongoDB. Means it has to be lowercase and plural
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    // Lookup for finding the number of channel the channel owner has subscriber to
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    // getting the number of documents present in that array and we are also using addFields so that we can add 2 more files to our user which contains the numbers.
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        // Here are checking a condition (cond) which helps is to check if the user who is logged in is subscribed to the channel or not.
        // We are using $subscribers.subscriber cause in that array there are objects so we want to make sure we are checking in that subscribers and not channel
        isSubscribed: {
          $cond: {
            // in method looks inside both array and objects
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            esle: false,
          }
        }
      }
    },
    // Project returns the selected fields
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        createdAt: 1,
      }
    }
  ]);

  // Check if theres any value in channel vairable or not
  if(!channel?.length){
    throw new ApiError(404, "Channel does not exists")
  }

  return res
  .status(200)
  .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
