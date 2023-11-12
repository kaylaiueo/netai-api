import { PostModel } from "../models/Post.model.js";
import { CommentModel } from "../models/Comment.model.js";
import { RepliesModel } from "../models/Replies.model.js";
import { UserModel } from "../models/User.model.js";
import { ActivitiesModel } from "../models/Activities.model.js";

export const getCommentById = async (req, res) => {
  const { id } = req.query;

  try {
    const comment = await CommentModel.findById(id).populate([
      {
        path: "owner",
        select: "username verify picture name",
      },
      {
        path: "ref",
        populate: [
          {
            path: "owner",
            select: "username verify picture",
          },
          {
            path: "comments",
            select: "_id replies",
          },
        ],
      },
    ]);
    res.json({ success: true, data: comment });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCommentInPost = async (req, res) => {
  const { postId } = req.params;
  const { skip } = req.query;

  try {
    const comments = await CommentModel.find({ ref: { $in: postId } })
      .populate([
        { path: "owner", select: "username picture verify" },
        { path: "replies" },
      ])
      .limit(10)
      .skip(skip ?? 0);

    res.json({ success: true, data: comments });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createComment = async (req, res) => {
  const { text, image, ref, owner } = req.body;
  const { postId } = req.params;

  try {
    const postNewComment = new CommentModel({
      text,
      image,
      ref,
      owner,
    });
    await postNewComment.save();

    await PostModel.findByIdAndUpdate(postId, {
      $push: {
        comments: postNewComment._id,
      },
    });

    const post = await PostModel.findById(ref).populate({
      path: "owner",
      select: "-password",
    });

    if (text.match(/@\w+/g)) {
      const mentionedUsers = text
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
        contentModel: "comments",
        refModel: "posts",
        type: "mentions",
        message: "Mentioned you in a comment",
        author: postNewComment.owner._id,
        content: postNewComment._id,
        ref: post._id,
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

    if (postNewComment.owner._id.toString() !== post.owner._id.toString()) {
      const newActivity = new ActivitiesModel({
        owner: post.owner._id,
        contentModel: "comments",
        refModel: "posts",
        type: "forYou",
        author: postNewComment.owner._id,
        message: "Commented on your post",
        content: postNewComment._id,
        ref: post._id,
      });
      await newActivity.save();

      await UserModel.findByIdAndUpdate(post.owner._id, {
        $push: {
          activities: newActivity._id,
        },
      });
    }

    res.json({
      success: true,
      message: "Commented successfully!",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const deletedComment = await CommentModel.findByIdAndDelete(commentId);

    await PostModel.findByIdAndUpdate(deletedComment.ref, {
      $pull: {
        comments: commentId,
      },
    });

    await RepliesModel.deleteMany({
      ref: commentId,
    });

    const getActivities = await ActivitiesModel.find({
      $or: [{ content: commentId }, { ref: commentId }],
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
