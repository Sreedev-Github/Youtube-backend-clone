import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      // Wehenever we know we will be using a key value for searching quite often, then we give it's index: true;
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudinary url for storing images
      required: true,
    },
    coverImage: {
      type: String, // cloudinary url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId.Id,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
// So here we are using a predefined middleware which is .pre it helps us to alter anything in our data before it is going to be saved.
// It takes multiple parameter like the one we used as "save" and a callback, but make sure to not use arrow functions as we might need to call this. to get access to the data.

userSchema.pre("save", async function (next) {
  // We get this.isModified in which we can pass a parameter in string which will check if the password has been modified, will return boolean
  if (this.isModified("password")) {
    this.password = bcrypt.hash(this.password, 10);
  }
  // Whenever using middleware we have to use next so that we know it has been completed and it can move to next step.
  next();
});

// Just like the hook above we can also create cutom methods like what we have already deleteOne, insertMany. So here we are creating a method called isPasswirdCorrect which checks if the password is correct or not.
// We use bcrypt for encrypting our password so it has a method called compare to help us check the passwords are same or not. It accepts a given password and the password which is stored to check.
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    // Takes 3 values =  Payloads, ACCESS TOKEN SECRET, and Expiry
    {
      // These are paylods you can give as much as you want
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// Refresh token
// Works almost as same as access Token but the difference being the number of days of expiry is high and you have to mention less payloads.
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
