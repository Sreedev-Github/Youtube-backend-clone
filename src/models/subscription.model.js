import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // One who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // One whose channel is
        ref: "User"
    },

}, {timestamps: true})

const Subscription = mongoose.model("Subscription", subscriptionSchema)