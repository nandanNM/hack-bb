import { Router } from "express";

import {
  getAssignmentDifficultyAnalysis,
  getClassWiseBreakdown,
  getDashboardStats,
  getLectureEngagement,
  getLevelProgressionStats,
  getRecentActivity,
  getSchoolWiseStats,
  getStudentsNeedingAttention,
  getTopPerformers,
} from "../controllers/analytics.controller";
import { requireAdminOrSuperAdmin, requireSuperAdmin } from "../middleware/role.middleware";

const analyticsRouter = Router();

analyticsRouter.get("/dashboard", requireAdminOrSuperAdmin, getDashboardStats);
analyticsRouter.get("/top-performers", requireAdminOrSuperAdmin, getTopPerformers);
analyticsRouter.get("/needs-attention", requireAdminOrSuperAdmin, getStudentsNeedingAttention);
analyticsRouter.get("/lecture-engagement", requireAdminOrSuperAdmin, getLectureEngagement);
analyticsRouter.get("/assignment-difficulty", requireSuperAdmin, getAssignmentDifficultyAnalysis);
analyticsRouter.get("/school-stats", requireSuperAdmin, getSchoolWiseStats);
analyticsRouter.get("/recent-activity", requireAdminOrSuperAdmin, getRecentActivity);
analyticsRouter.get("/class-breakdown", requireAdminOrSuperAdmin, getClassWiseBreakdown);
analyticsRouter.get("/level-progression", requireAdminOrSuperAdmin, getLevelProgressionStats);

export default analyticsRouter;
