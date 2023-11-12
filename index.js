import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { usersRouter } from "./routes/users.js";
import { postsRouter } from "./routes/posts.js";
import { commentsRouter } from "./routes/comment.js";
import { repliesRouter } from "./routes/replies.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: "https://netai.vercel.app" }));

app.use("/user", usersRouter);
app.use("/post", postsRouter);
app.use("/comment", commentsRouter);
app.use("/reply", repliesRouter);

app.get("/", (req, res) => {
  res.send("hai");
});

mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.listen(5000, () => console.log("server running on port 5000"));
