import { Router } from "express";

import { addComment, deleteComment, getVideoComment, updateComment } from "../controllers/comment.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js"
const router = Router();

router.use(verifyJWT);
router.route("/:videoId").post(addComment).get(getVideoComment)
router.route("/c/:commentId").patch(updateComment).delete(deleteComment)




export default router 