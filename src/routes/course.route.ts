import { Router } from "express";

import {
  createCourse,
  createCoursesCSV,
  deleteCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
} from "../controllers/course.controller";
import { requireAdminOrSuperAdmin, requireAnyAuth } from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const courseRouter = Router();

courseRouter.post("/create-course", requireAdminOrSuperAdmin, createCourse);
courseRouter.post("/create-courses-csv", requireAdminOrSuperAdmin, upload.single("file"), createCoursesCSV);
courseRouter.get("/all-courses", requireAnyAuth, getAllCourses);
courseRouter.get("/:id", requireAnyAuth, getCourseById);
courseRouter.put("/update-course/:id", requireAdminOrSuperAdmin, updateCourse);
courseRouter.delete("/delete-course/:id", requireAdminOrSuperAdmin, deleteCourse);

export default courseRouter;
