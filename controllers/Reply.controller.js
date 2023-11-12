import { ActivitiesModel } from "../models/Activities.model.js";
import { CommentModel } from "../models/Comment.model.js";
import { RepliesModel } from "../models/Replies.model.js";
import { UserModel } from "../models/User.model.js";

export const getRepliesInComment = async (req, res) => {
  const { commentId } = req.params;
  const { skip } = req.query;

  try {
    const replies = await RepliesModel.find({ ref: { $in: commentId } })
      .populate({ path: "owner", select: "username picture verify" })
      .limit(10)
      .skip(skip);

    res.json({ success: true, data: replies });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const createReplyComment = async (req, res) => {
  const { text, image, ref, owner } = req.body;
  const { commentId } = req.params;

  try {
    const postNewReply = new RepliesModel({
      text,
      image,
      ref,
      owner,
    });
    await postNewReply.save();

    await CommentModel.findByIdAndUpdate(commentId, {
      $push: {
        replies: postNewReply._id,
      },
    });

    const comment = await CommentModel.findById(ref).populate({
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
        contentModel: "replies",
        refModel: "comments",
        message: "Mentioned you in a comment",
        type: "mentions",
        author: postNewReply.owner._id,
        content: postNewReply._id,
        ref: comment._id,
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

    if (postNewReply.owner._id.toString() !== comment.owner._id.toString()) {
      const newActivity = new ActivitiesModel({
        owner: comment.owner._id,
        contentModel: "replies",
        refModel: "comments",
        type: "forYou",
        author: postNewReply.owner._id,
        message: "Replied to your comment",
        content: postNewReply._id,
        ref: comment._id,
      });
      await newActivity.save();

      await UserModel.findByIdAndUpdate(comment.owner._id, {
        $push: {
          activities: newActivity._id,
        },
      });
    }

    res.json({ success: true, message: "Replied successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const deleteReplyComment = async (req, res) => {
  const { replyId } = req.params;

  try {
    const deletedReply = await RepliesModel.findByIdAndDelete(replyId);

    await CommentModel.findByIdAndUpdate(deletedReply.ref, {
      $pull: {
        replies: replyId,
      },
    });

    if (deletedReply.text.match(/@\w+/g)) {
      const deletedActivity = await ActivitiesModel.findOneAndDelete({
        content: replyId,
      });

      await UserModel.find({
        _id: {
          $in: deletedActivity.owner,
        },
      }).updateMany({
        $pull: {
          activities: deletedActivity._id,
        },
      });
    }

    const deletedActivity = await ActivitiesModel.findOneAndDelete({
      content: replyId,
    });

    await UserModel.findByIdAndUpdate(deletedActivity.owner, {
      $pull: {
        activities: deletedActivity._id,
      },
    });

    res.json({ success: true, message: "Deleted successfully!" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
