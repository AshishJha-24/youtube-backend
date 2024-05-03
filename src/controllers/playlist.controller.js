import mongoose, { isValidObjectId } from "mongoose";
import { PlayList } from "../models/playList.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "User should be login");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User id is invalid");
  }

  if (!name || !description) {
    throw new ApiError(400, "name and description is required");
  }

  const playlist = await PlayList.create({
    name,
    description,
    owner: userId,
  });

  if (!playlist) {
    throw new ApiError(500, "failed to create playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playList is created "));
});

const getUserPlayLists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    throw new ApiError(200, "user id is invalid ");
  }

  const allplayList = await PlayList.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        updatedAt: 1,
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(200, allplayList, "Playlists are successfully feteched")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid palylist id");
  }

  const playList = await PlayList.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $match: {
        "videos.isPublished": true,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          duration: 1,
          createdAt: 1,
          views: 1,
        },
        owner: {
          username: 1,
          fullName: 1,
          avtar: 1,
        },
      },
    },
  ]);


  res
    .status(200)
    .json(new ApiResponse(200, playList[0], "playlist is fetched"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(
      400,
      "You are not authorized to add video to the playlist"
    );
  }
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist id and videoId both are required");
  }

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playList id or video Id");
  }

  const playList = await PlayList.findById(playlistId);
  const video = await Video.findById(videoId);

  if (
    (playList.owner?.toString() && video.owner.toString()) !== userId.toString()
  ) {
    throw new ApiError(
      400,
      "You can't add video to this playlist as you are not the owner"
    );
  }

  const addedVideoToPlaylist = await PlayList.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!addedVideoToPlaylist) {
    throw new ApiError(500, "Unable to add video to the playList");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        addedVideoToPlaylist,
        "video successfully add to the playList"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(
      400,
      "You are not authorized to add video to the playlist"
    );
  }
  if (!playlistId || !videoId) {
    throw new ApiError(400, "Playlist id and videoId both are required");
  }

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playList id or video Id");
  }

  const playList = await PlayList.findById(playlistId);
  const video = await Video.findById(videoId);

  if (
    (playList.owner?.toString() && video.owner.toString()) !== userId.toString()
  ) {
    throw new ApiError(
      400,
      "You can't add video to this playlist as you are not the owner"
    );
  }

  const removedVideoFromPlaylist = await PlayList.findByIdAndUpdate(
    playList._id,
    {
      $pull: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!removedVideoFromPlaylist) {
    throw new ApiError(500, "Unable to remove video from playList");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        removedVideoFromPlaylist,
        "Video is removed from Playlist "
      )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "you are not authorized to delete this playlist");
  }
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }

  const playList = await PlayList.findById(playlistId);

  if (!playList) {
    throw new ApiError(400, "No Playlist Such Found");
  }


  if (playList.owner?.toString() !==userId.toString()) {

    throw new ApiError(
      400,
      "You can't delete this Playlist as you are not the owner"
    );
  }

  const deletedPlayList = await PlayList.findByIdAndDelete(playlistId);

  if (!deletedPlayList) {
    throw new ApiError(500, "Unable to delte the playList");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "playList is deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "You are not authorized to update playlist");
  }

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist Id");
  }

  if (!name || !description) {
    throw new ApiError(400, "name and description both are required");
  }

  const playList = await PlayList.findById(playlistId);

  if (!playList) {
    throw new ApiError(404, "PlayList not found");
  }

  if (userId.toString() !== playList.owner.toString()) {
    throw new ApiError(
      400,
      "you can't update playlist because you are not owner"
    );
  }

  const updatedPlaylist = await PlayList.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "Unable to update playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated"));

  t;
});

export {
  createPlaylist,
  getUserPlayLists,
  addVideoToPlaylist,
  getPlaylistById,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
};
