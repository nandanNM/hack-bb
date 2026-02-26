import { Router } from "express";

import {
  getAllSchoolsWithPackages,
  getPackagesBySchool,
  togglePackage,
  updatePackages,
} from "../controllers/packages.controller";
import { requireAnyAuth, requireSuperAdmin } from "../middleware/role.middleware";

const packagesRouter = Router();

packagesRouter.get("/all-schools", requireSuperAdmin, getAllSchoolsWithPackages);
packagesRouter.get("/:schoolId", requireAnyAuth, getPackagesBySchool);
packagesRouter.put("/:schoolId", requireSuperAdmin, updatePackages);
packagesRouter.post("/:schoolId/toggle", requireSuperAdmin, togglePackage);

export default packagesRouter;
