import { Router } from "express";

import {
  assignInstructorToCourse,
  assignMultipleInstructorsToCourse,
  getAllCourseInstructors,
  getAvailableInstructorsForCourse,
  getCoursesByInstructor,
  getInstructorsByCourse,
  removeInstructorFromCourse,
  removeInstructorFromCourseByIds,
  updateCourseInstructor,
} from "../controllers/courseInstructor.controller";
import { requireSuperAdmin } from "../middleware/role.middleware";

const courseInstructorRouter = Router();

courseInstructorRouter.get("/all", requireSuperAdmin, getAllCourseInstructors);
courseInstructorRouter.get("/course/:courseId/instructors", requireSuperAdmin, getInstructorsByCourse);
courseInstructorRouter.get("/instructor/:instructorId/courses", requireSuperAdmin, getCoursesByInstructor);
courseInstructorRouter.get(
  "/course/:courseId/available-instructors",
  requireSuperAdmin,
  getAvailableInstructorsForCourse,
);
courseInstructorRouter.post("/assign", requireSuperAdmin, assignInstructorToCourse);
courseInstructorRouter.post("/assign-multiple", requireSuperAdmin, assignMultipleInstructorsToCourse);
courseInstructorRouter.put("/update/:id", requireSuperAdmin, updateCourseInstructor);
courseInstructorRouter.delete("/remove/:id", requireSuperAdmin, removeInstructorFromCourse);
courseInstructorRouter.delete("/remove-by-ids", requireSuperAdmin, removeInstructorFromCourseByIds);

export default courseInstructorRouter;
