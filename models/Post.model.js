import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  caption: { type: String },
  image: {
    src: String,
    width: Number,
    height: Number,
  },
  createdAt: { type: Date, default: Date.now },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "comments" }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
});

export const PostModel = mongoose.model("posts", PostSchema);
