import { Router } from "express";

import { createSuperAdmin, passwordChange, updateControllerProfile } from "../controllers/superAdmin.controller";
import { requireController, requireSuperAdmin } from "../middleware/role.middleware";

const superAdminRouter = Router();

superAdminRouter.post("/create-super-admin", createSuperAdmin);
superAdminRouter.post("/change-password", requireController, passwordChange);
superAdminRouter.put("/profile", requireSuperAdmin, updateControllerProfile);

export default superAdminRouter;
