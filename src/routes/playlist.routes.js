import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import { addVideoToPlaylist, createPlaylist, getPlaylistById, getUserPlayLists,  deletePlaylist,updatePlaylist, removeVideoFromPlaylist } from "../controllers/playlist.controller.js";


const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist)

router
      .route("/:playlistId")
      .get(getPlaylistById)
      .delete( deletePlaylist)
      .patch(updatePlaylist)


      
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist)
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist)
router.route("/user/:userId").get(getUserPlayLists);


export default router ;


