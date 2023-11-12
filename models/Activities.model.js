import mongoose from "mongoose";

const ActivitiesSchema = new mongoose.Schema({
  owner: [
    { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  ],
  createdAt: { type: Date, default: Date.now },
  refModel: { type: String, enum: ["posts", "comments"] },
  contentModel: {
    type: String,
    enum: ["comments", "replies", "posts"],
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  message: { type: String },
  content: { type: mongoose.Schema.Types.ObjectId, refPath: "contentModel" },
  ref: { type: mongoose.Schema.Types.ObjectId, refPath: "refModel" },
  type: { type: String, enum: ["forYou", "mentions"] },
});

export const ActivitiesModel = mongoose.model("activities", ActivitiesSchema);
