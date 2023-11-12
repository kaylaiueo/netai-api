import express from "express";
import * as controller from "../controllers/Comment.controller.js";

const router = express.Router();

router.get("/", controller.getCommentById);
router.get("/:postId", controller.getCommentInPost);
router.post("/:postId", controller.createComment);
router.delete("/:commentId", controller.deleteComment);

export { router as commentsRouter };
