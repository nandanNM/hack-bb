import { eq, type InferSelectModel } from "drizzle-orm";
import { NextFunction, Request, Response } from "express";

import { db } from "../db";
import { school } from "../db/schema";
import { ApiError } from "../utils/apiResponse.utils";

type SchoolRow = InferSelectModel<typeof school>;

export async function tenantResolver(req: Request & { school?: SchoolRow }, res: Response, next: NextFunction) {
  try {
    let domain: string | null = null;

    const nodeEnvironment = process.env.NODE_ENV as string;
    if (nodeEnvironment === "development") {
      domain = (req.headers["x-school-domain"] as string) || "system";
    } else {
      // to get client origin
      const origin = req.headers.origin;
      if (!origin) return ApiError(res, "Origin header is required", 400);

      const url = new URL(origin);
      const hostParts = url.hostname.split(".");
      const subdomain = "demo";

      domain = subdomain || (req.headers["x-school-domain"] as string) || null;
      if (!domain) return ApiError(res, "Tenant not provided", 400);
    }

    const schoolRows = await db.select().from(school).where(eq(school.domain, domain)).execute();

    if (!schoolRows || schoolRows.length === 0) {
      if (domain === "system") {
        req.school = undefined;
        return next();
      }

      if (
        req.path.startsWith("/sign-") ||
        req.path.startsWith("/get-session") ||
        req.path.startsWith("/session") ||
        req.path.includes("/auth/")
      ) {
        req.school = undefined;
        return next();
      }

      return ApiError(res, `Unknown tenant: ${domain}`, 404);
    }

    req.school = schoolRows[0];

    next();
  } catch (err) {
    next(err);
  }
}

// Here what we can do is create a dummy school for dev enviromnent.
// we can create a dev enviromnent variable to check if we are in dev mode or not.
// for dev enviroment we can set the school to a dummy school.
// This will help us to test the multi-tenancy feature without the need of subdomain or header.
// in case we need more than 1 header we can create more on the go.

// In production we will use the subdomain or header to resolve the tenant.
// why do we need a header ? this -> x-school-domain

// testing using tunneling
// https://theboroer.github.io/localtunnel-www/

// this is not a good way i have just mentioned it, better way is to manually create dummy schools and use them instead.
