import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


// There are times when you don't need the res parameter so you can set it to _ (underscore)
export const verifyJWT = asyncHandler(async (req, _, next) => {
 try {
     const token =
       req.cookies?.accessToken ||
       req.header("Authorization")?.replace("Bearer ", "");
   
     if (!token) {
       throw new ApiError(401, "Unauthorized Request");
     }
   
     // As we have set multiple payload in the generateAccessToken method so we will get all of them after destructuring
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
   
     const user = await User.findById(decodedToken?._id).select(
       "-password -refreshToken"
     );
   
     if (!user) {
       throw new ApiError(401, "Invalid Access Token");
     }
   
     // Add the user object in the request
     req.user = user;
   
     next();
 } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token")
 }
});
