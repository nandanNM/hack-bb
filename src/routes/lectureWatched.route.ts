import { Router } from "express";

import {
  deleteWatchProgress,
  getLectureViewers,
  getRecentlyWatched,
  getStudentWatchHistory,
  getWatchProgress,
  updateWatchProgress,
} from "../controllers/lectureWatched.controller";
import { requireAdminOrSuperAdmin, requireAnyAuth } from "../middleware/role.middleware";

const lectureWatchedRouter = Router();

lectureWatchedRouter.post("/update", requireAnyAuth, updateWatchProgress);
lectureWatchedRouter.get("/progress/:studentId/:lectureId", requireAnyAuth, getWatchProgress);
lectureWatchedRouter.get("/history/:studentId", requireAnyAuth, getStudentWatchHistory);
lectureWatchedRouter.get("/recent/:studentId", requireAnyAuth, getRecentlyWatched);
lectureWatchedRouter.get("/viewers/:lectureId", requireAdminOrSuperAdmin, getLectureViewers);
lectureWatchedRouter.delete("/:studentId/:lectureId", requireAnyAuth, deleteWatchProgress);

export default lectureWatchedRouter;
