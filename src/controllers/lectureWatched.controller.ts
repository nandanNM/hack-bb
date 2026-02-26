// fix this - dont check right now
import { and, eq } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import { idParamSchema, updateWatchProgressSchema, validateSchema, watchProgressParamsSchema } from "./validation";
import { user } from "../db/auth-schema";
import { lecture, lectureWatched, student } from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

export const updateWatchProgress = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(updateWatchProgressSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { studentId, lectureId, watchedTime } = validation.data;

    // Verify student and lecture exist concurrently
    const [studentExists, lectureExists] = await Promise.all([
      db.select().from(student).where(eq(student.id, studentId)).limit(1),
      db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1),
    ]);

    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    // Check if watch record already exists
    const existingWatch = await db
      .select()
      .from(lectureWatched)
      .where(and(eq(lectureWatched.studentId, studentId), eq(lectureWatched.lectureId, lectureId)))
      .limit(1);

    let result;

    if (existingWatch.length > 0) {
      // Update existing watch progress
      result = await db
        .update(lectureWatched)
        .set({ watchedTime })
        .where(and(eq(lectureWatched.studentId, studentId), eq(lectureWatched.lectureId, lectureId)))
        .returning();
    } else {
      // Create new watch record
      result = await db
        .insert(lectureWatched)
        .values({
          studentId,
          lectureId,
          watchedTime,
        })
        .returning();
    }

    return ApiSuccess(res, "Watch progress updated successfully", 200, result[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getWatchProgress = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(watchProgressParamsSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { studentId, lectureId } = validation.data;

    const watchProgress = await db
      .select({
        id: lectureWatched.id,
        studentId: lectureWatched.studentId,
        lectureId: lectureWatched.lectureId,
        watchedTime: lectureWatched.watchedTime,
        lastUpdated: lectureWatched.updatedAt,
        lectureTitle: lecture.title,
        lectureUrl: lecture.url,
      })
      .from(lectureWatched)
      .innerJoin(lecture, eq(lectureWatched.lectureId, lecture.id))
      .where(and(eq(lectureWatched.studentId, studentId), eq(lectureWatched.lectureId, lectureId)))
      .limit(1);

    if (watchProgress.length === 0) {
      return ApiSuccess(res, "No watch progress found", 200, { watchedTime: 0 });
    }

    return ApiSuccess(res, "Watch progress fetched successfully", 200, watchProgress[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentWatchHistory = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.studentId });
    if (!validation.success) {
      return ApiError(res, "studentId is required", 400);
    }

    const studentId = validation.data.id;

    const studentExists = await db.select().from(student).where(eq(student.id, studentId)).limit(1);
    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    const watchHistory = await db
      .select({
        id: lectureWatched.id,
        lectureId: lectureWatched.lectureId,
        watchedTime: lectureWatched.watchedTime,
        lastUpdated: lectureWatched.updatedAt,
        lectureTitle: lecture.title,
        lectureDescription: lecture.description,
        lectureUrl: lecture.url,
      })
      .from(lectureWatched)
      .innerJoin(lecture, eq(lectureWatched.lectureId, lecture.id))
      .where(eq(lectureWatched.studentId, studentId))
      .orderBy(lectureWatched.updatedAt);

    return ApiSuccess(res, "Watch history fetched successfully", 200, {
      studentId,
      totalVideos: watchHistory.length,
      history: watchHistory,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getLectureViewers = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.lectureId });
    if (!validation.success) {
      return ApiError(res, "lectureId is required", 400);
    }

    const lectureId = validation.data.id;

    const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    const viewers = await db
      .select({
        id: lectureWatched.id,
        studentId: lectureWatched.studentId,
        studentName: user.name,
        studentEmail: user.email,
        watchedTime: lectureWatched.watchedTime,
        lastUpdated: lectureWatched.updatedAt,
      })
      .from(lectureWatched)
      .innerJoin(student, eq(lectureWatched.studentId, student.id))
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(lectureWatched.lectureId, lectureId))
      .orderBy(lectureWatched.updatedAt);

    return ApiSuccess(res, "Lecture viewers fetched successfully", 200, {
      lectureId,
      totalViewers: viewers.length,
      viewers,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteWatchProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, lectureId } = req.params;

    if (!studentId || !lectureId) {
      return ApiError(res, "studentId and lectureId are required", 400);
    }

    const existingWatch = await db
      .select()
      .from(lectureWatched)
      .where(and(eq(lectureWatched.studentId, studentId), eq(lectureWatched.lectureId, lectureId)))
      .limit(1);

    if (existingWatch.length === 0) {
      return ApiError(res, "Watch progress not found", 404);
    }

    await db
      .delete(lectureWatched)
      .where(and(eq(lectureWatched.studentId, studentId), eq(lectureWatched.lectureId, lectureId)));

    return ApiSuccess(res, "Watch progress deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getRecentlyWatched = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!studentId) {
      return ApiError(res, "studentId is required", 400);
    }

    const studentExists = await db.select().from(student).where(eq(student.id, studentId)).limit(1);
    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    const recentlyWatched = await db
      .select({
        id: lectureWatched.id,
        lectureId: lectureWatched.lectureId,
        watchedTime: lectureWatched.watchedTime,
        lastUpdated: lectureWatched.updatedAt,
        lectureTitle: lecture.title,
        lectureDescription: lecture.description,
        lectureUrl: lecture.url,
      })
      .from(lectureWatched)
      .innerJoin(lecture, eq(lectureWatched.lectureId, lecture.id))
      .where(eq(lectureWatched.studentId, studentId))
      .orderBy(lectureWatched.updatedAt)
      .limit(limit);

    return ApiSuccess(res, "Recently watched lectures fetched successfully", 200, recentlyWatched);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
