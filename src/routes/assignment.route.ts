import { Router } from "express";

import {
  createAssignment,
  createBulkAssignments,
  deleteAssignment,
  getAllAssignments,
  getAssignmentById,
  getAssignmentsByLecture,
  getAssignmentWithProgress,
  updateAssignment,
} from "../controllers/assignment.controller";
import { requireAnyAuth, requireSuperAdmin } from "../middleware/role.middleware";

const assignmentRouter = Router();

assignmentRouter.get("/lecture/:lectureId", requireAnyAuth, getAssignmentsByLecture);
assignmentRouter.get("/:id", requireAnyAuth, getAssignmentById);
assignmentRouter.get("/:assignmentId/progress/:studentId", requireAnyAuth, getAssignmentWithProgress);
assignmentRouter.get("/", requireSuperAdmin, getAllAssignments);
assignmentRouter.post("/create", requireSuperAdmin, createAssignment);
assignmentRouter.post("/create-bulk", requireSuperAdmin, createBulkAssignments);
assignmentRouter.put("/:id", requireSuperAdmin, updateAssignment);
assignmentRouter.delete("/:id", requireSuperAdmin, deleteAssignment);

export default assignmentRouter;
