import { ActivitiesModel } from "../models/Activities.model.js";
import { PostModel } from "../models/Post.model.js";
import { UserModel } from "../models/User.model.js";
import { CommentModel } from "../models/Comment.model.js";
import { RepliesModel } from "../models/Replies.model.js";

export const getPostsByUsername = async (req, res) => {
  const { skip, username } = req.query;

  try {
    const user = await UserModel.findOne({ username });
    const posts = await PostModel.find(
      { owner: user._id },
      {},
      { sort: { createdAt: -1 } }
    )
      .populate([
        { path: "owner", select: "username picture verify" },
        { path: "comments" },
      ])
      .limit(10)
      .skip(skip ?? 0);

    res.json({ success: true, data: posts });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getAllPosts = async (req, res) => {
  const { skip, imageonly, id } = req.query;

  try {
    const posts = await PostModel.find(
      {
        "image.src": { $exists: imageonly },
        owner: { $ne: id },
      },
      {},
      { sort: { createdAt: -1 } }
    )
      .populate([{ path: "comments" }, { path: "owner", select: "-password" }])
      .skip(skip ?? 0)
      .limit(10);

    res.json({ success: true, data: posts });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getLikedPostsByUsername = async (req, res) => {
  const { skip, username } = req.query;

  try {
    const user = await UserModel.findOne({ username });
    const likedPosts = await PostModel.find(
      {
        likes: {
          $in: [user._id],
        },
      },
      {},
      { sort: { createdAt: -1 } }
    )
      .populate([
        { path: "owner", select: "username picture verify" },
        { path: "comments" },
      ])
      .limit(10)
      .skip(skip ?? 0);

    res.json({ success: true, data: likedPosts });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getImagePostsByUsername = async (req, res) => {
  const { skip, username } = req.query;

  try {
    const user = await UserModel.findOne({ username });
    const postsWithImage = await PostModel.find(
      {
        "image.src": { $exists: true },
        owner: { $in: user._id },
      },
      {},
      { sort: { createdAt: -1 } }
    )
      .populate([
        { path: "owner", select: "username picture verify" },
        { path: "comments" },
      ])
      .limit(10)
      .skip(skip ?? 0);

    res.json({ success: true, data: postsWithImage });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getPostById = async (req, res) => {
  const { postId } = req.params;

  try {
    const post = await PostModel.findById(postId).populate([
      {
        path: "owner",
        select: "username picture verify name",
      },
      { path: "comments" },
    ]);

    res.json({ success: true, data: post });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createPost = async (req, res) => {
  const { image, caption, owner } = req.body;

  try {
    const newPost = new PostModel({
      image: {
        src: image.src,
        width: image.width,
        height: image.height,
      },
      caption,
      owner,
    });
    await newPost.save();

    await UserModel.findByIdAndUpdate(owner, {
      $push: {
        posts: newPost._id,
      },
    });

    if (caption.match(/@\w+/g)) {
      const mentionedUsers = caption
        .match(/@\w+/g)
        .map((username) => username.slice(1));

      const getMentionedUsersId = await UserModel.find({
        username: {
          $in: mentionedUsers,
        },
      }).select("_id");

      const filteredId = getMentionedUsersId.filter(
        (data) => data._id.toString() !== owner
      );

      const newActivity = new ActivitiesModel({
        owner: filteredId,
        contentModel: "posts",
        type: "mentions",
        message: "Mentioned you in a post",
        author: newPost.owner._id,
        content: newPost._id,
      });
      await newActivity.save();

      await UserModel.find({
        _id: {
          $in: newActivity.owner,
        },
      }).updateMany({
        $push: {
          activities: newActivity._id,
        },
      });
    }

    res.json({ success: true, message: "Posted successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    const deletedPost = await PostModel.findByIdAndDelete(postId);

    await UserModel.findByIdAndUpdate(deletedPost.owner, {
      $pull: {
        posts: deletedPost._id,
      },
    });

    const getCommentId = await CommentModel.find({
      ref: {
        $in: deletedPost._id,
      },
    }).select("_id");

    await CommentModel.deleteMany({
      _id: {
        $in: getCommentId,
      },
    });

    await RepliesModel.deleteMany({
      ref: {
        $in: getCommentId,
      },
    });

    const getActivities = await ActivitiesModel.find({
      $or: [
        { content: deletedPost._id },
        { ref: deletedPost._id },
        { ref: { $in: getCommentId } },
      ],
    }).select("_id owner");

    const activitiesId = getActivities.map((data) => data._id);
    const activitiesOwnerId = getActivities.flatMap((data) => data.owner);

    await ActivitiesModel.deleteMany({
      _id: {
        $in: activitiesId,
      },
    });

    await UserModel.find({
      _id: {
        $in: activitiesOwnerId,
      },
    }).updateMany({
      $pull: {
        activities: {
          $in: activitiesId,
        },
      },
    });

    res.json({ success: true, message: "Deleted successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const likePost = async (req, res) => {
  const { userId } = req.body;
  const { postId } = req.params;

  try {
    const post = await PostModel.findById(postId);

    if (post.likes.includes(userId)) {
      try {
        await PostModel.findByIdAndUpdate(postId, {
          $pull: {
            likes: userId,
          },
        });

        const deletedActivity = await ActivitiesModel.findOneAndDelete({
          message: "liked your post",
          ref: postId,
        });

        await UserModel.findByIdAndUpdate(post.owner._id, {
          $pull: {
            activities: deletedActivity._id,
          },
        });

        return res.json({ success: true, message: "Disliked successfully!" });
      } catch (error) {
        return res.json({ success: false, message: error.message });
      }
    }

    await PostModel.findByIdAndUpdate(postId, {
      $addToSet: {
        likes: userId,
      },
    });

    if (post.owner._id.toString() !== userId) {
      const newActivity = new ActivitiesModel({
        owner: post.owner._id,
        refModel: "posts",
        type: "forYou",
        author: userId,
        message: "liked your post",
        ref: postId,
      });
      await newActivity.save();

      await UserModel.findByIdAndUpdate(post.owner._id, {
        $push: {
          activities: newActivity._id,
        },
      });
    }

    res.json({ success: true, message: "Liked successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
