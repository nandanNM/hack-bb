// Testing Phase Completed
import { eq, type InferSelectModel } from "drizzle-orm";
import { Request, Response } from "express";

import { db } from "../db";
import { school, schoolDomain } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type SchoolRow = InferSelectModel<typeof school>;

export const verifyDomain = async (req: Request & { school?: SchoolRow }, res: Response) => {
  try {
    const resolvedSchool = req.school;

    if (!resolvedSchool) {
      return ApiError(res, "No tenant/domain resolved from request", 400);
    }

    const domain = resolvedSchool.domain;

    if (!domain) {
      return ApiError(res, "Domain not found in resolved school", 400);
    }

    const domainExists = await db.select().from(schoolDomain).where(eq(schoolDomain.domain, domain)).limit(1);

    if (domainExists.length === 0) {
      return ApiSuccess(res, "Domain does not exist in database", 200, {
        exists: false,
        domain,
      });
    }

    return ApiSuccess(res, "Domain exists in database", 200, {
      domain,
      exists: true,
      domainId: domainExists[0].id,
      schoolId: domainExists[0].schoolId,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
