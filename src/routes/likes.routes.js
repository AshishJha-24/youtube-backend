import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { getLikedVideos, toggleCommentLikes,toggleTweetLikes,toggleVideoLikes } from "../controllers/like.controller.js";



const router = Router();

router.use(verifyJWT);
router.route("/toggle/v/:videoId").get(toggleVideoLikes)
router.route("/toggle/c/:commentId").get(toggleCommentLikes)
router.route("/toggle/t/:tweetId").get(toggleTweetLikes)
router.route("/videos").get(getLikedVideos)



export default router;