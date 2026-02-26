// Testing Phase Complete
import { eq } from "drizzle-orm";
import { Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import {
  createSchoolSchema,
  idParamSchema,
  schoolCSVRowSchema,
  updateSchoolSchema,
  validateSchema,
} from "./validation";
import { CSVSchoolRow } from "./validation/types";
import { controller, packages, school, schoolController, schoolDomain, schoolStudent, student } from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";
import { generateSchoolDomain } from "../utils/domain.util";

type Request = AuthenticatedRequest;

const DEFAULT_THEME_PRIMARY = "#4F46E5";
const DEFAULT_THEME_SECONDARY = "#7C3AED";

export const getAllSchools = async (req: Request, res: Response) => {
  try {
    const schools = await db
      .select({
        id: school.id,
        schoolName: school.schoolName,
        domain: school.domain,
        schoolCity: school.schoolCity,
        schoolState: school.schoolState,
        schoolCountry: school.schoolCountry,
      })
      .from(school);

    return ApiSuccess(res, "Schools fetched successfully", 200, schools);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createSchoolCSV = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return ApiError(res, "No file uploaded", 400);
    }

    const csv = file.buffer.toString("utf8");

    const { data, errors } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length) {
      return ApiError(res, "CSV parse error", 400);
    }

    const createdSchools = [];
    const failedSchools = [];

    for (const sch of data as CSVSchoolRow[]) {
      try {
        const rowValidation = validateSchema(schoolCSVRowSchema, sch);
        if (!rowValidation.success) {
          failedSchools.push({
            schoolName: sch.schoolName || "unknown",
            reason: rowValidation.error,
          });
          continue;
        }

        const {
          schoolName,
          schoolAddress,
          schoolCity,
          schoolState,
          schoolZip,
          schoolCountry,
          schoolEmail,
          schoolLogoUrl,
          themePrimary,
          themeSecondary,
        } = rowValidation.data;

        const generatedDomain = generateSchoolDomain(schoolName, schoolCity);

        const existingSchool = await db.select().from(school).where(eq(school.domain, generatedDomain)).limit(1);

        if (existingSchool.length > 0) {
          failedSchools.push({
            schoolName: schoolName,
            reason: `School with domain ${generatedDomain} already exists`,
          });
          continue;
        }

        const newSchool = await db
          .insert(school)
          .values({
            schoolName: schoolName,
            schoolEmail: schoolEmail || "",
            domain: generatedDomain,
            schoolAddress: schoolAddress,
            schoolCity: schoolCity,
            schoolState: schoolState,
            schoolZip: schoolZip,
            schoolCountry: schoolCountry,
            schoolLogoUrl: schoolLogoUrl || null,
            themePrimary: themePrimary || DEFAULT_THEME_PRIMARY,
            themeSecondary: themeSecondary || DEFAULT_THEME_SECONDARY,
          })
          .returning();

        await db.insert(schoolDomain).values({
          domain: generatedDomain,
          schoolId: newSchool[0].id,
        });

        await db.insert(packages).values({
          schoolId: newSchool[0].id,
          curioCode: false,
          curioAi: false,
          curioBot: false,
          curioThink: false,
        });

        createdSchools.push({ schoolName: schoolName, schoolDomain: generatedDomain });
      } catch (error) {
        failedSchools.push({
          schoolName: sch.schoolName || "unknown",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(
      res,
      `School creation process completed. ${createdSchools.length} created, ${failedSchools.length} failed`,
      201,
      {
        failed: failedSchools,
        created: createdSchools,
        failedCount: failedSchools.length,
        successCount: createdSchools.length,
      },
    );
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createSchool = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createSchoolSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const {
      schoolZip,
      schoolName,
      schoolCity,
      schoolState,
      schoolCountry,
      schoolAddress,
      schoolEmail,
      schoolLogoUrl,
      themePrimary,
      themeSecondary,
    } = validation.data;

    const generatedDomain = generateSchoolDomain(schoolName, schoolCity);

    const existingSchool = await db.select().from(school).where(eq(school.domain, generatedDomain)).limit(1);

    if (existingSchool.length > 0) {
      return ApiError(res, `School with domain ${generatedDomain} already exists`, 400);
    }

    const newSchool = await db
      .insert(school)
      .values({
        domain: generatedDomain,
        schoolName,
        schoolAddress,
        schoolCity,
        schoolState,
        schoolZip,
        schoolCountry,
        schoolEmail,
        schoolLogoUrl: schoolLogoUrl || null,
        themePrimary: themePrimary || DEFAULT_THEME_PRIMARY,
        themeSecondary: themeSecondary || DEFAULT_THEME_SECONDARY,
      })
      .returning();

    Promise.all([
      await db.insert(schoolDomain).values({
        domain: generatedDomain,
        schoolId: newSchool[0].id,
      }),
      await db.insert(packages).values({
        schoolId: newSchool[0].id,
        curioCode: false,
        curioAi: false,
        curioBot: false,
        curioThink: false,
      }),
    ]);

    return ApiSuccess(res, "School created successfully", 201, { schoolDomain: generatedDomain });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateSchool = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateSchoolSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const {
      schoolName,
      schoolAddress,
      schoolCity,
      schoolState,
      schoolZip,
      schoolCountry,
      schoolEmail,
      schoolLogoUrl,
      themePrimary,
      themeSecondary,
    } = bodyValidation.data;

    const existingSchool = await db.select().from(school).where(eq(school.id, id)).limit(1);

    if (existingSchool.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    const updateData: Record<string, string> = {};
    if (schoolName) updateData.schoolName = schoolName;
    if (schoolAddress) updateData.schoolAddress = schoolAddress;
    if (schoolCity) updateData.schoolCity = schoolCity;
    if (schoolState) updateData.schoolState = schoolState;
    if (schoolZip) updateData.schoolZip = schoolZip;
    if (schoolCountry) updateData.schoolCountry = schoolCountry;
    if (schoolEmail !== undefined) updateData.schoolEmail = schoolEmail;
    if (schoolLogoUrl) updateData.schoolLogoUrl = schoolLogoUrl;
    if (themePrimary) updateData.themePrimary = themePrimary;
    if (themeSecondary) updateData.themeSecondary = themeSecondary;

    if (Object.keys(updateData).length === 0) {
      return ApiError(res, "No fields to update", 400);
    }

    const updatedSchool = await db.update(school).set(updateData).where(eq(school.id, id)).returning();

    return ApiSuccess(res, "School updated successfully", 200, updatedSchool[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteSchool = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingSchool = await db.select().from(school).where(eq(school.id, id)).limit(1);

    if (existingSchool.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    const [schoolStudents, schoolControllers] = await Promise.all([
      db.select({ studentId: schoolStudent.studentId }).from(schoolStudent).where(eq(schoolStudent.schoolId, id)),
      db
        .select({ controllerId: schoolController.controllerId })
        .from(schoolController)
        .where(eq(schoolController.schoolId, id)),
    ]);

    const studentDeletions = schoolStudents.map(({ studentId }) => db.delete(student).where(eq(student.id, studentId)));
    const controllerDeletions = schoolControllers.map(({ controllerId }) =>
      db.delete(controller).where(eq(controller.id, controllerId)),
    );

    await Promise.all([...studentDeletions, ...controllerDeletions]);
    await db.delete(school).where(eq(school.id, id));

    return ApiSuccess(res, "School deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getSchoolById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingSchool = await db.select().from(school).where(eq(school.id, id)).limit(1);

    if (existingSchool.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    return ApiSuccess(res, "School fetched successfully", 200, existingSchool[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllSchoolsAdmin = async (req: Request, res: Response) => {
  try {
    const schools = await db.select().from(school);
    return ApiSuccess(res, "Schools fetched successfully", 200, schools);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
