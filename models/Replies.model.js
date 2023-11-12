import mongoose from "mongoose";

const RepliesSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  ref: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "comments",
    required: true,
  },
  text: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const RepliesModel = mongoose.model("replies", RepliesSchema);
