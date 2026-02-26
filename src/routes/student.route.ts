import { Router } from "express";

import {
  banStudent,
  createStudent,
  createStudentCSV,
  deleteStudent,
  getAllStudents,
  getStudentById,
  getStudentsBySchool,
  studentPasswordChange,
  updateStudent,
} from "../controllers/student.controller";
import {
  requireAdminOrSuperAdmin,
  requireAdminSchoolAccess,
  requireAnyAuth,
  requireSuperAdmin,
} from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const studentRouter = Router();

studentRouter.post("/change-password", requireAnyAuth, studentPasswordChange);
studentRouter.post("/create", requireAdminOrSuperAdmin, requireAdminSchoolAccess, createStudent);
studentRouter.post(
  "/create-csv",
  requireAdminOrSuperAdmin,
  requireAdminSchoolAccess,
  upload.single("file"),
  createStudentCSV,
);
studentRouter.get("/all", requireAdminOrSuperAdmin, requireAdminSchoolAccess, getAllStudents);
studentRouter.get("/:id", requireAdminOrSuperAdmin, requireAdminSchoolAccess, getStudentById);
studentRouter.get("/school/:schoolId", requireAdminOrSuperAdmin, requireAdminSchoolAccess, getStudentsBySchool);
studentRouter.put("/:id", requireAdminOrSuperAdmin, requireAdminSchoolAccess, updateStudent);
studentRouter.put("/:id/ban", requireAdminOrSuperAdmin, requireAdminSchoolAccess, banStudent);
studentRouter.delete("/:id", requireSuperAdmin, deleteStudent);

export default studentRouter;
