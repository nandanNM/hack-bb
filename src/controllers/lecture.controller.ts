// Testing Phase Complete
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import {
  createLectureSchema,
  idParamSchema,
  lectureCSVRowSchema,
  updateLectureSchema,
  validateSchema,
} from "./validation";
import { lecture } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

export const getAllLectures = async (req: Request, res: Response) => {
  try {
    const lectures = await db.select().from(lecture);
    return ApiSuccess(res, "Lectures fetched successfully", 200, lectures);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getLectureById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingLecture = await db.select().from(lecture).where(eq(lecture.id, id)).limit(1);

    if (existingLecture.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    return ApiSuccess(res, "Lecture fetched successfully", 200, existingLecture[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createLecture = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createLectureSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { title, description, url } = validation.data;

    const newLecture = await db.insert(lecture).values({ title, description, url }).returning();

    return ApiSuccess(res, "Lecture created successfully", 201, newLecture[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateLecture = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateLectureSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { title, description, url } = bodyValidation.data;

    const existingLecture = await db.select().from(lecture).where(eq(lecture.id, id)).limit(1);

    if (existingLecture.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    const updateData: Record<string, string> = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (url) updateData.url = url;

    if (Object.keys(updateData).length === 0) {
      return ApiError(res, "No fields to update", 400);
    }

    const updatedLecture = await db.update(lecture).set(updateData).where(eq(lecture.id, id)).returning();

    return ApiSuccess(res, "Lecture updated successfully", 200, updatedLecture[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteLecture = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingLecture = await db.select().from(lecture).where(eq(lecture.id, id)).limit(1);

    if (existingLecture.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    await db.delete(lecture).where(eq(lecture.id, id));

    return ApiSuccess(res, "Lecture deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createLecturesCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return ApiError(res, "CSV file is required", 400);
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const parsedData = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    if (parsedData.errors.length > 0) {
      return ApiError(res, "CSV parsing failed", 400, { errors: parsedData.errors });
    }

    const lectures = parsedData.data as Array<{ title: string; description: string; url: string }>;

    if (lectures.length === 0) {
      return ApiError(res, "No valid lecture data found in CSV", 400);
    }

    const successList: Array<{ id: string; title: string }> = [];
    const failedList: Array<{ title: string; reason: string }> = [];

    for (const lec of lectures) {
      try {
        const rowValidation = validateSchema(lectureCSVRowSchema, lec);
        if (!rowValidation.success) {
          failedList.push({
            title: lec.title || "N/A",
            reason: rowValidation.error,
          });
          continue;
        }

        const { title, description, url } = rowValidation.data;

        const newLecture = await db.insert(lecture).values({ title, description, url }).returning();

        successList.push({
          id: newLecture[0].id,
          title: newLecture[0].title,
        });
      } catch (error) {
        failedList.push({
          title: lec.title || "N/A",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(res, "Bulk lecture creation completed", 200, {
      total: lectures.length,
      successful: successList.length,
      failed: failedList.length,
      successList,
      failedList,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
