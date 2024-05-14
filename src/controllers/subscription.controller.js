import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const checkSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId
  });

  if(!checkSubscription){
    const addSubscription = await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    })
    return res
      .status(200)
      .json(new ApiResponse(200, addSubscription, "Subscription has been added"));
  }else{
    const removeSubscription = await Subscription.findByIdAndDelete(checkSubscription._id)
    return res
    .status(200)
    .json(new ApiResponse(200, removeSubscription, "Subscription has been removed"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'subscriber',
        foreignField: '_id',
        as: 'subscriberDetails',
      },
    },
    {
      $unwind: '$subscriberDetails',
    },
    {
      $project: {
        _id: 1, // Flagging 0 as we don't need it
        channel: '$channel',
        'subscriber.username': '$subscriberDetails.username',
        'subscriber.avatar': '$subscriberDetails.avatar',
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribers, 'Subscribers has been fetched'));
});

export default getUserChannelSubscribers;


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const subscribed = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'channel',
        foreignField: '_id',
        as: 'subscribedChannels',
      },
    },
    {
      $unwind: '$subscribedChannels',
    },
    {
      $project: {
        _id: 1, // Flagging 0 as we don't need it
        channel: '$channel',
        'subscriber.username': '$subscribedChannels.username',
        'subscriber.avatar': '$subscribedChannels.avatar',
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, subscribed, 'Subscribed users have been fetched'));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
