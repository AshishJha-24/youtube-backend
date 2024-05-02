import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import {verifyJWT} from "../middlewares/auth.middleware.js"
import { publishVideo, updateVideo ,togglePublishStatus, deleteVideo, getAllVideos} from "../controllers/video.controller.js";

const router=Router();

router.use(verifyJWT)
router.route("/").get(getAllVideos)
.post(upload.fields([
    {
        name:"video",
        maxCount:1
       },
       {
           name:"thumbnail",
           maxCount:1
       }
]), publishVideo)

router.route("/:videoId").patch(upload.single("thumbnail"),updateVideo).delete(deleteVideo)
router.route("/toggle/publish/:videoId").patch(togglePublishStatus)









export default router;