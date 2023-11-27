import bcrypt from "bcrypt";
import { UserModel } from "../models/User.model.js";
import { ActivitiesModel } from "../models/Activities.model.js";
import { PostModel } from "../models/Post.model.js";
import { CommentModel } from "../models/Comment.model.js";
import { RepliesModel } from "../models/Replies.model.js";

export const getSuggestedUsers = async (req, res) => {
  const { id } = req.query;

  try {
    const users = await UserModel.find(
      {
        _id: { $ne: id },
        followers: { $ne: id },
      },
      {},
      { sort: { createdAt: -1 } }
    )
      .limit(4)
      .select("username picture verify name followers");

    res.json({ success: true, data: users });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getUserByUsername = async (req, res) => {
  const { username } = req.params;

  try {
    const user = await UserModel.findOne({ username })
      .populate([
        { path: "followers", select: "-password" },
        { path: "following", select: "-password" },
        {
          path: "posts",
          populate: [
            {
              path: "owner",
              select: "-password",
            },
            { path: "comments", populate: { path: "replies" } },
          ],
        },
      ])
      .select("-password");

    res.json({ success: true, data: user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getActivities = async (req, res) => {
  const { userId } = req.params;
  const { type, skip } = req.query;

  try {
    const activities = await ActivitiesModel.find(
      {
        owner: { $in: userId },
        type,
      },
      {},
      { sort: { createdAt: -1 } }
    )
      .populate([
        { path: "author", select: "username verify picture followers" },
        { path: "content", select: "-owner -ref" },
        {
          path: "ref",
          select: "-comments -likes",
          populate: { path: "owner", select: "username verify picture" },
        },
      ])
      .skip(skip ?? 0)
      .limit(10);

    res.json({ success: true, data: activities });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await UserModel.findById(userId)
      .populate([
        { path: "activities" },
        { path: "followers", select: "-password" },
        { path: "following", select: "-password" },
        {
          path: "posts",
          populate: { path: "comments", populate: { path: "replies" } },
        },
      ])
      .select("-password");

    res.json({ success: true, data: user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getUsersByInput = async (req, res) => {
  const { id } = req.query;
  const { query } = req.params;

  try {
    const users = await UserModel.find({
      _id: { $ne: id },
      username: { $regex: query, $options: "i" },
    }).select("-password");

    res.json({ success: true, data: users });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const register = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const user = await UserModel.findOne({ username });

    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists, try another username",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new UserModel({
      name,
      username,
      password: hashedPassword,
    });
    await newUser.save();

    res.json({ success: true, message: "Registered successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User doesn't exists!",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Username or password is incorrect!",
      });
    }

    res.json({ success: true, data: user._id });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const editProfile = async (req, res) => {
  const { name, bio, link, picture, username } = req.body;
  const { id } = req.query;

  try {
    const user = await UserModel.findById(id).select("updatedAt username");

    if (user.updatedAt) {
      const currentDate = new Date();
      const isTwoWeeks = new Date(
        user.updatedAt.getTime() + 14 * 24 * 60 * 60 * 1000
      );

      if (currentDate !== isTwoWeeks && user.username !== username) {
        return res.status(400).json({
          success: false,
          message: `You can change your username after ${isTwoWeeks.toLocaleDateString(
            "en-US",
            { dateStyle: "long" }
          )}`,
        });
      }
    }

    const isUserExists = await UserModel.findOne({ username });

    if (isUserExists && isUserExists._id.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "User already exists, try another username",
      });
    }

    const updateUser = await UserModel.findByIdAndUpdate(id, {
      name,
      bio,
      link,
      picture,
      username,
      ...(!isUserExists && { updatedAt: new Date() }),
    });

    await updateUser.save();

    res.json({ success: true, data: updateUser.picture });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const follow = async (req, res) => {
  const { userId, username } = req.body;

  try {
    const user = await UserModel.findOne({ username });

    const newActivity = new ActivitiesModel({
      owner: user._id,
      message: "followed you",
      author: userId,
      type: "forYou",
    });

    await newActivity.save();

    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: {
        following: user._id,
      },
    });

    await UserModel.findByIdAndUpdate(user._id, {
      $addToSet: {
        followers: userId,
        activities: newActivity._id,
      },
    });

    res.json({ success: true, message: "Followed" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const unfollow = async (req, res) => {
  const { userId, username } = req.body;

  try {
    const user = await UserModel.findOne({ username });

    const deletedActivity = await ActivitiesModel.findOneAndDelete({
      author: userId,
      message: "followed you",
    });

    await UserModel.findByIdAndUpdate(user._id, {
      $pull: {
        followers: userId,
        activities: deletedActivity._id,
      },
    });

    await UserModel.findByIdAndUpdate(userId, {
      $pull: {
        following: user._id,
      },
    });

    res.json({ success: true, message: "Unfollowed" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteAcc = async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await UserModel.findOneAndDelete({
      _id: userId,
    }).select("_id following followers");

    await UserModel.find({
      $or: [
        { following: { $in: deletedUser._id } },
        { followers: { $in: deletedUser._id } },
      ],
    }).updateMany({
      $pull: {
        following: { $in: deletedUser._id },
        followers: { $in: deletedUser._id },
      },
    });

    const userPosts = await PostModel.find({
      owner: deletedUser._id,
    }).select("_id");

    await PostModel.deleteMany({ _id: { $in: userPosts } });

    await PostModel.find({
      likes: { $in: deletedUser._id },
    }).updateMany({
      $pull: {
        likes: { $in: deletedUser._id },
      },
    });

    const commentsOnUserPosts = await CommentModel.find({
      ref: { $in: userPosts },
    }).select("_id");

    await CommentModel.deleteMany({ _id: { $in: commentsOnUserPosts } });

    const getCommentsOnOtherPosts = await CommentModel.find({
      owner: { $in: deletedUser._id },
    }).select("replies ref _id");

    const commentsId = getCommentsOnOtherPosts.map((data) => data._id);
    const commentsRef = getCommentsOnOtherPosts.map((data) => data.ref);
    const repliesOnComment = getCommentsOnOtherPosts.flatMap(
      (data) => data.replies
    );

    if (repliesOnComment.length > 0) {
      await RepliesModel.deleteMany({
        _id: { $in: repliesOnComment },
      });
    }

    await CommentModel.deleteMany({
      _id: { $in: commentsId },
    });

    await PostModel.find({
      _id: { $in: commentsRef },
    }).updateMany({
      $pull: {
        comments: { $in: commentsId },
      },
    });

    const repliesCommentOnUserPosts = await RepliesModel.find({
      ref: { $in: commentsOnUserPosts },
    }).select("_id");

    await RepliesModel.deleteMany({
      _id: { $in: repliesCommentOnUserPosts },
    });

    const getRepliesOnOtherComments = await RepliesModel.find({
      owner: { $in: deletedUser._id },
    }).select("ref _id");

    const repliesId = getRepliesOnOtherComments.map((data) => data._id);
    const repliesRef = getRepliesOnOtherComments.map((data) => data.ref);

    await RepliesModel.deleteMany({
      _id: { $in: repliesId },
    });

    await CommentModel.find({
      _id: { $in: repliesRef },
    }).updateMany({
      $pull: {
        replies: { $in: repliesId },
      },
    });

    const deleteActivitiesByAuthor = await ActivitiesModel.find({
      author: { $in: deletedUser._id },
    }).select("_id owner");

    const activitiesIdByAuthor = deleteActivitiesByAuthor.map(
      (data) => data._id
    );
    const activitiesOwnerByAuthor = deleteActivitiesByAuthor.flatMap(
      (data) => data.owner
    );

    await ActivitiesModel.deleteMany({
      _id: { $in: activitiesIdByAuthor },
    });

    await UserModel.find({
      _id: { $in: activitiesOwnerByAuthor },
    }).updateMany({
      $pull: {
        activities: { $in: activitiesIdByAuthor },
      },
    });

    const activitiesWithOneOwner = await ActivitiesModel.find({
      $and: [{ owner: { $size: 1 } }, { owner: { $in: deletedUser._id } }],
    }).select("_id");

    await ActivitiesModel.deleteMany({
      _id: { $in: activitiesWithOneOwner },
    });

    await ActivitiesModel.find({
      $and: [
        {
          $expr: {
            $gt: [{ $size: "$owner" }, 1],
          },
        },
        { owner: { $in: deletedUser._id } },
      ],
    }).updateMany({
      $pull: {
        owner: { $in: deletedUser._id },
      },
    });

    const getActivities = await ActivitiesModel.find({
      $or: [
        {
          $or: [
            { content: { $in: userPosts } },
            { content: { $in: commentsId } },
            { content: { $in: repliesId } },
          ],
        },
        {
          $or: [{ ref: { $in: userPosts } }, { ref: { $in: commentsId } }],
        },
      ],
    }).select("_id owner");

    const activitiesId = getActivities.map((data) => data._id);
    const activitiesOwner = getActivities.flatMap((data) => data.owner);

    await ActivitiesModel.deleteMany({
      _id: { $in: activitiesId },
    });

    await UserModel.find({
      _id: { $in: activitiesOwner },
    }).updateMany({
      $pull: {
        activities: { $in: activitiesId },
      },
    });

    res.json({ success: true, message: "Delete account successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
