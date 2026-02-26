import { Router } from "express";

import {
  createSchool,
  createSchoolCSV,
  deleteSchool,
  getAllSchools,
  getAllSchoolsAdmin,
  getSchoolById,
  updateSchool,
} from "../controllers/school.controller";
import { requireAdminOrSuperAdmin, requireAnyAuth, requireSuperAdmin } from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const schoolRouter = Router();

schoolRouter.get("/all", requireAnyAuth, getAllSchools);
schoolRouter.post("/create", requireSuperAdmin, createSchool);
schoolRouter.post("/create-csv", requireSuperAdmin, upload.single("file"), createSchoolCSV);
schoolRouter.get("/admin/all", requireAdminOrSuperAdmin, getAllSchoolsAdmin);
schoolRouter.get("/:id", requireAdminOrSuperAdmin, getSchoolById);
schoolRouter.put("/:id", requireSuperAdmin, updateSchool);
schoolRouter.delete("/:id", requireSuperAdmin, deleteSchool);

export default schoolRouter;
