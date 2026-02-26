import { Router } from "express";

import {
  getQnaCompletionStatus,
  getStudentCompletedQnas,
  getStudentLectureProgress,
  markQnaCompleted,
  markQnaInProgress,
} from "../controllers/qnaCompleted.controller";
import { requireAnyAuth } from "../middleware/role.middleware";

const qnaCompletedRouter = Router();

qnaCompletedRouter.post("/in-progress", requireAnyAuth, markQnaInProgress);
qnaCompletedRouter.post("/complete", requireAnyAuth, markQnaCompleted);
qnaCompletedRouter.get("/status/:studentId/:qnaId", requireAnyAuth, getQnaCompletionStatus);
qnaCompletedRouter.get("/student/:studentId", requireAnyAuth, getStudentCompletedQnas);
qnaCompletedRouter.get("/progress/:studentId/:lectureId", requireAnyAuth, getStudentLectureProgress);

export default qnaCompletedRouter;
