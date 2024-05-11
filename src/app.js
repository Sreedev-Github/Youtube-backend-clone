import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
// Cookie-Parser helps us to get and store cookies from the users browser. We can even save some secure cookies which can only be read & deleted by the server. So cookie parser helps us this.
app.use(cookieParser());

// Security practices with middleware
app.use(express.json({ limit: "16kb" }));


// routes import

import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js"



// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)

// http://localhost:3000/api/v1/users/register

export { app };