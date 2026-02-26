import { eq } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import { idParamSchema, togglePackageSchema, updatePackagesSchema, validateSchema } from "./validation";
import { packages, school } from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

export const getPackagesBySchool = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.schoolId });
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const schoolId = validation.data.id;

    const [schoolExists, schoolPackages] = await Promise.all([
      db.select().from(school).where(eq(school.id, schoolId)).limit(1),
      db.select().from(packages).where(eq(packages.schoolId, schoolId)).limit(1),
    ]);

    if (schoolExists.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    if (schoolPackages.length === 0) {
      return ApiError(res, "No packages found for this school", 404);
    }

    return ApiSuccess(res, "Packages fetched successfully", 200, schoolPackages[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updatePackages = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, { id: req.params.schoolId });
    if (!paramValidation.success) {
      return ApiError(res, "School ID is required", 400);
    }

    const schoolId = paramValidation.data.id;

    const bodyValidation = validateSchema(updatePackagesSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { curioCode, curioAi, curioBot, curioThink } = bodyValidation.data;

    const schoolExists = await db.select().from(school).where(eq(school.id, schoolId)).limit(1);
    if (schoolExists.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    const existingPackages = await db.select().from(packages).where(eq(packages.schoolId, schoolId)).limit(1);

    if (existingPackages.length === 0) {
      return ApiError(res, "No packages found for this school", 404);
    }

    const updateData: Record<string, boolean> = {};
    if (curioCode !== undefined) updateData.curioCode = curioCode;
    if (curioAi !== undefined) updateData.curioAi = curioAi;
    if (curioBot !== undefined) updateData.curioBot = curioBot;
    if (curioThink !== undefined) updateData.curioThink = curioThink;

    if (Object.keys(updateData).length === 0) {
      return ApiError(res, "No valid package fields to update", 400);
    }

    const updatedPackages = await db
      .update(packages)
      .set(updateData)
      .where(eq(packages.schoolId, schoolId))
      .returning();

    return ApiSuccess(res, "Packages updated successfully", 200, updatedPackages[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const togglePackage = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, { id: req.params.schoolId });
    if (!paramValidation.success) {
      return ApiError(res, "School ID is required", 400);
    }

    const schoolId = paramValidation.data.id;

    const bodyValidation = validateSchema(togglePackageSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { packageName, enabled } = bodyValidation.data;

    const schoolExists = await db.select().from(school).where(eq(school.id, schoolId)).limit(1);
    if (schoolExists.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    const existingPackages = await db.select().from(packages).where(eq(packages.schoolId, schoolId)).limit(1);

    if (existingPackages.length === 0) {
      return ApiError(res, "No packages found for this school", 404);
    }

    const updatedPackages = await db
      .update(packages)
      .set({ [packageName]: enabled })
      .where(eq(packages.schoolId, schoolId))
      .returning();

    return ApiSuccess(
      res,
      `Package ${packageName} ${enabled ? "enabled" : "disabled"} successfully`,
      200,
      updatedPackages[0],
    );
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllSchoolsWithPackages = async (req: Request, res: Response) => {
  try {
    const schoolsWithPackages = await db
      .select({
        schoolId: school.id,
        schoolName: school.schoolName,
        domain: school.domain,
        curioCode: packages.curioCode,
        curioAi: packages.curioAi,
        curioBot: packages.curioBot,
        curioThink: packages.curioThink,
      })
      .from(school)
      .leftJoin(packages, eq(school.id, packages.schoolId));

    return ApiSuccess(res, "Schools with packages fetched successfully", 200, schoolsWithPackages);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
