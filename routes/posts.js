import express from "express";
import * as controller from "../controllers/Post.controller.js";

const router = express.Router();

router.post("/", controller.createPost);
router.get("/", controller.getAllPosts);
router.get("/owned", controller.getPostsByUsername);
router.get("/media", controller.getImagePostsByUsername);
router.get("/liked", controller.getLikedPostsByUsername);
router.get("/:postId", controller.getPostById);
router.delete("/:postId", controller.deletePost);
router.put("/like/:postId", controller.likePost);
router.put("/dislike/:postId", controller.dislikePost);

export { router as postsRouter };
