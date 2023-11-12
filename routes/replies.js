import express from "express";
import * as controller from "../controllers/Reply.controller.js";

const router = express.Router();

router.get("/:commentId", controller.getRepliesInComment);
router.post("/:commentId", controller.createReplyComment);
router.delete("/:replyId", controller.deleteReplyComment);

export { router as repliesRouter };
