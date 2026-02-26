import { Router } from "express";

import {
  createComment,
  deleteComment,
  getCommentById,
  getCommentCount,
  getCommentsByAssignment,
  getCommentsByStudent,
  updateComment,
} from "../controllers/comment.controller";
import { requireAnyAuth } from "../middleware/role.middleware";

const commentRouter = Router();

// comments should only be deleted by the author or admin/superadmin --- IGNORE ---
commentRouter.post("/create", requireAnyAuth, createComment);
commentRouter.get("/assignment/:assignmentId", requireAnyAuth, getCommentsByAssignment);
commentRouter.get("/assignment/:assignmentId/count", requireAnyAuth, getCommentCount);
commentRouter.get("/student/:studentId", requireAnyAuth, getCommentsByStudent);
commentRouter.get("/:id", requireAnyAuth, getCommentById);
commentRouter.put("/:id", requireAnyAuth, updateComment);
commentRouter.delete("/:id", requireAnyAuth, deleteComment);

export default commentRouter;
