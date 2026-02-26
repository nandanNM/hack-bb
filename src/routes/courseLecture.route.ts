import { Router } from "express";

import {
  assignLectureToCourse,
  assignMultipleLecturesToCourse,
  getAllCourseLectures,
  getAvailableLecturesForCourse,
  getCoursesByLecture,
  getLecturesByCourse,
  removeLectureFromCourse,
  removeLectureFromCourseByIds,
  updateCourseLecture,
} from "../controllers/courseLecture.controller";
import { requireSuperAdmin } from "../middleware/role.middleware";

const courseLectureRouter = Router();

courseLectureRouter.get("/all", requireSuperAdmin, getAllCourseLectures);

courseLectureRouter.get("/course/:courseId/lectures", requireSuperAdmin, getLecturesByCourse);

courseLectureRouter.get("/lecture/:lectureId/courses", requireSuperAdmin, getCoursesByLecture);

courseLectureRouter.get("/course/:courseId/available-lectures", requireSuperAdmin, getAvailableLecturesForCourse);

courseLectureRouter.post("/assign", requireSuperAdmin, assignLectureToCourse);

courseLectureRouter.post("/assign-multiple", requireSuperAdmin, assignMultipleLecturesToCourse);

courseLectureRouter.put("/update/:id", requireSuperAdmin, updateCourseLecture);

courseLectureRouter.delete("/remove/:id", requireSuperAdmin, removeLectureFromCourse);

courseLectureRouter.delete("/remove-by-ids", requireSuperAdmin, removeLectureFromCourseByIds);

export default courseLectureRouter;
