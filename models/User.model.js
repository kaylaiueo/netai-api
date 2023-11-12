import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  picture: { type: String },
  bio: { type: String },
  link: { type: String },
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: "activities" }],
  verify: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "posts" }],
});

export const UserModel = mongoose.model("users", UserSchema);
