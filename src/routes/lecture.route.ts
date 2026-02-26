import { Router } from "express";

import {
  createLecture,
  createLecturesCSV,
  deleteLecture,
  getAllLectures,
  getLectureById,
  updateLecture,
} from "../controllers/lecture.controller";
import { requireAnyAuth, requireSuperAdmin } from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const lectureRouter = Router();

lectureRouter.post("/create-lecture", requireAnyAuth, requireSuperAdmin, createLecture);
lectureRouter.post("/create-lectures-csv", requireSuperAdmin, upload.single("file"), createLecturesCSV);
lectureRouter.get("/all-lectures", requireAnyAuth, getAllLectures);
lectureRouter.get("/:id", requireAnyAuth, getLectureById);
lectureRouter.put("/update-lecture/:id", requireSuperAdmin, updateLecture);
lectureRouter.delete("/delete-lecture/:id", requireSuperAdmin, deleteLecture);

export default lectureRouter;
