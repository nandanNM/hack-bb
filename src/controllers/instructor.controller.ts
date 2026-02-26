// Testing Phase Completed
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import {
  createInstructorSchema,
  idParamSchema,
  instructorCSVRowSchema,
  updateInstructorSchema,
  validateSchema,
} from "./validation";
import { instructor } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

export const getAllInstructors = async (req: Request, res: Response) => {
  try {
    const instructors = await db.select().from(instructor);
    return ApiSuccess(res, "Instructors fetched successfully", 200, instructors);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getInstructorById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingInstructor = await db.select().from(instructor).where(eq(instructor.id, id)).limit(1);

    if (existingInstructor.length === 0) {
      return ApiError(res, "Instructor not found", 404);
    }

    return ApiSuccess(res, "Instructor fetched successfully", 200, existingInstructor[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createInstructor = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createInstructorSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { name, detail } = validation.data;

    const newInstructor = await db.insert(instructor).values({ name, detail }).returning();

    return ApiSuccess(res, "Instructor created successfully", 201, newInstructor[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateInstructor = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateInstructorSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { name, detail } = bodyValidation.data;

    const existingInstructor = await db.select().from(instructor).where(eq(instructor.id, id)).limit(1);

    if (existingInstructor.length === 0) {
      return ApiError(res, "Instructor not found", 404);
    }

    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (detail) updateData.detail = detail;

    if (Object.keys(updateData).length === 0) {
      return ApiError(res, "No fields to update", 400);
    }

    const updatedInstructor = await db.update(instructor).set(updateData).where(eq(instructor.id, id)).returning();

    return ApiSuccess(res, "Instructor updated successfully", 200, updatedInstructor[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteInstructor = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingInstructor = await db.select().from(instructor).where(eq(instructor.id, id)).limit(1);

    if (existingInstructor.length === 0) {
      return ApiError(res, "Instructor not found", 404);
    }

    await db.delete(instructor).where(eq(instructor.id, id));

    return ApiSuccess(res, "Instructor deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createInstructorsCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return ApiError(res, "CSV file is required", 400);
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const parsedData = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    if (parsedData.errors.length > 0) {
      return ApiError(res, "CSV parsing failed", 400, { errors: parsedData.errors });
    }

    const instructors = parsedData.data as Array<{ name: string; detail: string }>;

    const successList: Array<{ id: string; name: string }> = [];
    const failedList: Array<{ name: string; reason: string }> = [];

    for (const inst of instructors) {
      try {
        // Validate CSV row with Zod
        const rowValidation = validateSchema(instructorCSVRowSchema, inst);
        if (!rowValidation.success) {
          failedList.push({
            name: inst.name || "N/A",
            reason: rowValidation.error,
          });
          continue;
        }

        const { name, detail } = rowValidation.data;

        const newInstructor = await db.insert(instructor).values({ name, detail }).returning();

        successList.push({
          id: newInstructor[0].id,
          name: newInstructor[0].name,
        });
      } catch (error) {
        failedList.push({
          name: inst.name || "N/A",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(res, "Bulk instructor creation completed", 200, {
      total: instructors.length,
      successful: successList.length,
      failed: failedList.length,
      successList,
      failedList,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
