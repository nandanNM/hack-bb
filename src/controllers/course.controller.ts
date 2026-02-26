// Testing Phase Completed
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import {
  courseCSVRowSchema,
  createCourseSchema,
  idParamSchema,
  updateCourseSchema,
  validateSchema,
} from "./validation";
import { course } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const courses = await db.select().from(course);
    return ApiSuccess(res, "Courses fetched successfully", 200, courses);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingCourse = await db.select().from(course).where(eq(course.id, id)).limit(1);

    if (existingCourse.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    return ApiSuccess(res, "Course fetched successfully", 200, existingCourse[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createCourseSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { courseName, courseDetail, courseImage, link } = validation.data;

    const newCourse = await db.insert(course).values({ courseName, courseDetail, courseImage, link }).returning();

    return ApiSuccess(res, "Course created successfully", 201, newCourse[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateCourseSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { courseName, courseDetail, courseImage, link } = bodyValidation.data;

    const existingCourse = await db.select().from(course).where(eq(course.id, id)).limit(1);

    if (existingCourse.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const updateData: Record<string, string | object> = {};
    if (courseName) updateData.courseName = courseName;
    if (courseDetail) updateData.courseDetail = courseDetail;
    if (courseImage) updateData.courseImage = courseImage;
    if (link) {
      updateData.link = link;
    }

    if (Object.keys(updateData).length === 0) {
      return ApiError(res, "No fields to update", 400);
    }

    const updatedCourse = await db.update(course).set(updateData).where(eq(course.id, id)).returning();

    return ApiSuccess(res, "Course updated successfully", 200, updatedCourse[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingCourse = await db.select().from(course).where(eq(course.id, id)).limit(1);

    if (existingCourse.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    await db.delete(course).where(eq(course.id, id));

    return ApiSuccess(res, "Course deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createCoursesCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return ApiError(res, "CSV file is required", 400);
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const parsedData = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    if (parsedData.errors.length > 0) {
      return ApiError(res, "CSV parsing failed", 400, { errors: parsedData.errors });
    }

    const courses = parsedData.data as Array<{
      courseName: string;
      courseDetail: string;
      courseImage: string;
      link: string;
    }>;

    const successList: Array<{ id: string; courseName: string }> = [];
    const failedList: Array<{ courseName: string; reason: string }> = [];

    for (const crs of courses) {
      try {
        // Validate CSV row with Zod
        const rowValidation = validateSchema(courseCSVRowSchema, crs);
        if (!rowValidation.success) {
          failedList.push({
            courseName: crs.courseName || "N/A",
            reason: rowValidation.error,
          });
          continue;
        }

        const { courseName, courseDetail, courseImage, link } = rowValidation.data;

        let linkArray;
        try {
          linkArray = JSON.parse(link);
          if (!Array.isArray(linkArray)) {
            throw new Error("Link must be an array");
          }
          // Validate each item is a valid URL
          for (const url of linkArray) {
            if (typeof url !== "string" || !url.match(/^https?:\/\/.+/)) {
              throw new Error("Each link must be a valid URL string");
            }
          }
        } catch (error) {
          failedList.push({
            courseName,
            reason: error instanceof Error ? error.message : "link must be a valid JSON array of URLs",
          });
          continue;
        }

        const newCourse = await db
          .insert(course)
          .values({ courseName, courseDetail, courseImage, link: linkArray })
          .returning();

        successList.push({
          id: newCourse[0].id,
          courseName: newCourse[0].courseName,
        });
      } catch (error) {
        failedList.push({
          courseName: crs.courseName || "N/A",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(res, "Bulk course creation completed", 200, {
      total: courses.length,
      successful: successList.length,
      failed: failedList.length,
      successList,
      failedList,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
