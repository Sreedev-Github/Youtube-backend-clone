// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

// Better Approach

connectDB()





// Second Approach

// This semi-colon helps the server to understand that this is a different function or line of code as if you you might have forgotten to add a semi colon on the code before IIFE then it will help you, so it's a common practice.
// ;(async ()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     } catch (error) {
//         console.error("ERROR: ", error);
//         throw error
//     }
// })()