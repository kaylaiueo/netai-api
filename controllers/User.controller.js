import bcrypt from "bcrypt";
import { UserModel } from "../models/User.model.js";
import { ActivitiesModel } from "../models/Activities.model.js";

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
  const { name, bio, link, picture } = req.body;
  const { id } = req.query;

  try {
    const user = await UserModel.findByIdAndUpdate(id, {
      name,
      bio,
      link,
      picture,
    });
    await user.save();

    res.json({ success: true, data: user.picture });
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
