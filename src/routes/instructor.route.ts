import { Router } from "express";

import {
  createInstructor,
  createInstructorsCSV,
  deleteInstructor,
  getAllInstructors,
  getInstructorById,
  updateInstructor,
} from "../controllers/instructor.controller";
import { requireAdminOrSuperAdmin } from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const instructorRouter = Router();

instructorRouter.post("/create-instructor", requireAdminOrSuperAdmin, createInstructor);
instructorRouter.post("/create-instructors-csv", requireAdminOrSuperAdmin, upload.single("file"), createInstructorsCSV);
instructorRouter.get("/all-instructors", requireAdminOrSuperAdmin, getAllInstructors);
instructorRouter.get("/:id", requireAdminOrSuperAdmin, getInstructorById);
instructorRouter.put("/update-instructor/:id", requireAdminOrSuperAdmin, updateInstructor);
instructorRouter.delete("/delete-instructor/:id", requireAdminOrSuperAdmin, deleteInstructor);

export default instructorRouter;
