import { Router } from "express";

import { verifyDomain } from "../controllers/domain.controller";
import { tenantResolver } from "../middleware/tenant.middleware";

const domainRouter = Router();

domainRouter.get("/verify", tenantResolver, verifyDomain);

export default domainRouter;
