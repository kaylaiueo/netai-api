import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  ref: { type: mongoose.Schema.Types.ObjectId, ref: "posts", required: true },
  text: { type: String },
  createdAt: { type: Date, default: Date.now },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "replies" }],
});

export const CommentModel = mongoose.model("comments", CommentSchema);
