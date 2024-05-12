import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, togglePublishStatus, updateVideo, uploadVideo } from "../controllers/video.controller.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").get(getAllVideos)

router.route("/:videoId/togglePublish").patch(togglePublishStatus)

router.route("/upload").post(
    upload.fields([
    {
        name: "video",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1,
    }
]), uploadVideo)

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

export default router;


// deleteVideo,
// getAllVideos,
// getVideoById,
// publishAVideo,
// togglePublishStatus,
// updateVideo,