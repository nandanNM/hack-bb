import { Router } from "express";

import {
  createAdmin,
  createAdminCSV,
  deleteAdminById,
  getAdminById,
  getAdminsBySchool,
  getAllAdmins,
  updateAdmin,
  updateAdminBySuperAdmin,
} from "../controllers/admin.controller";
import { requireAdmin, requireSuperAdmin } from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const adminRouter = Router();

adminRouter.post("/create", requireSuperAdmin, createAdmin);
adminRouter.post("/create-csv", requireSuperAdmin, upload.single("file"), createAdminCSV);
adminRouter.delete("/:id", requireSuperAdmin, deleteAdminById);
adminRouter.get("/all", requireSuperAdmin, getAllAdmins);
adminRouter.get("/:id", requireSuperAdmin, getAdminById);
adminRouter.get("/school/:schoolId", requireSuperAdmin, getAdminsBySchool);
adminRouter.put("/:id", requireSuperAdmin, updateAdminBySuperAdmin);

adminRouter.put("/profile", requireAdmin, updateAdmin);

export default adminRouter;
