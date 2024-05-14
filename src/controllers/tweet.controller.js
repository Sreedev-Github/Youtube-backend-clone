import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// Create Tweet
const createTweet = asyncHandler(async (req, res) => {
    const content = req.body?.content

    if(!(content?.trim() && req.body.content)){
        throw new ApiError(400, "Please provide a valid content")
    }
    console.log(req.body.user);

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"))

})

// Get user Tweets
const getUserTweets = asyncHandler(async (req, res) => {

    if(!req.params.userId){
        throw new ApiError(400, "Please provide a userId")
    }
    
    const { userId } = req.params

    const user = await User.findById(userId)

    if(!user){
        throw new ApiError(400, "No user found with the given userId")
    }


    const userTweets = await Tweet.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, userTweets, "User tweets has been fetched"))

})

const updateTweet = asyncHandler(async (req, res) => {
    if (!req.body.content){
        throw new ApiError(400, "Please provid a valid tweet")
    }

    const {tweetId} = req.params;

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content: req.body.content
            }
        },
        {new: true}
    )
    
    if(!updatedTweet){
        throw new ApiError(500, "There was some error while updating tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet has been updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {

    const {tweetId} = req.params;

    const deletedTweet = await Tweet.findByIdAndDelete(
        tweetId
    )

    if(!deletedTweet){
        throw new ApiError(500, "There was some error while trying to delete your tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "You tweet has been deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}