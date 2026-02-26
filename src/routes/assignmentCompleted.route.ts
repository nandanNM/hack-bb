import { Router } from "express";

import {
  getAssignmentCompletionAnalytics,
  getAssignmentCompletionStatus,
  getLectureCompletionAnalytics,
  getStudentCompletedAssignments,
  getStudentOverallProgress,
} from "../controllers/assignmentCompleted.controller";
import { requireAdminOrSuperAdmin, requireAnyAuth } from "../middleware/role.middleware";

const assignmentCompletedRouter = Router();

assignmentCompletedRouter.get("/status/:studentId/:assignmentId", requireAnyAuth, getAssignmentCompletionStatus);
assignmentCompletedRouter.get("/student/:studentId", requireAnyAuth, getStudentCompletedAssignments);
assignmentCompletedRouter.get("/student/:studentId/overall", requireAnyAuth, getStudentOverallProgress);
assignmentCompletedRouter.get(
  "/analytics/assignment/:assignmentId",
  requireAdminOrSuperAdmin,
  getAssignmentCompletionAnalytics,
);
assignmentCompletedRouter.get("/analytics/lecture/:lectureId", requireAdminOrSuperAdmin, getLectureCompletionAnalytics);

export default assignmentCompletedRouter;
