// Testing Phase Completed
import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";

import { db } from "../db";
import { assignLectureSchema, bulkAssignLecturesSchema, idParamSchema, validateSchema } from "./validation";
import { course, courseLecture, lecture } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

export const getAllCourseLectures = async (req: Request, res: Response) => {
  try {
    const assignments = await db
      .select({
        id: courseLecture.id,
        courseName: course.courseName,
        lectureTitle: lecture.title,
        courseId: courseLecture.courseId,
        createdAt: courseLecture.createdAt,
        lectureId: courseLecture.lectureId,
      })
      .from(courseLecture)
      .innerJoin(course, eq(courseLecture.courseId, course.id))
      .innerJoin(lecture, eq(courseLecture.lectureId, lecture.id));

    return ApiSuccess(res, "Course lectures fetched successfully", 200, assignments);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getLecturesByCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.courseId });
    if (!validation.success) {
      return ApiError(res, "Course ID is required", 400);
    }

    const courseId = validation.data.id;

    const courseExists = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
    if (courseExists.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const lectures = await db
      .select({
        id: lecture.id,
        title: lecture.title,
        description: lecture.description,
        url: lecture.url,
        assignmentId: courseLecture.id,
      })
      .from(courseLecture)
      .innerJoin(lecture, eq(courseLecture.lectureId, lecture.id))
      .where(eq(courseLecture.courseId, courseId));

    return ApiSuccess(res, "Course lectures fetched successfully", 200, lectures);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCoursesByLecture = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.lectureId });
    if (!validation.success) {
      return ApiError(res, "Lecture ID is required", 400);
    }

    const lectureId = validation.data.id;

    const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    const courses = await db
      .select({
        id: course.id,
        courseName: course.courseName,
        courseDetail: course.courseDetail,
        courseImage: course.courseImage,
        assignmentId: courseLecture.id,
      })
      .from(courseLecture)
      .innerJoin(course, eq(courseLecture.courseId, course.id))
      .where(eq(courseLecture.lectureId, lectureId));

    return ApiSuccess(res, "Lecture courses fetched successfully", 200, courses);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAvailableLecturesForCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.courseId });
    if (!validation.success) {
      return ApiError(res, "Course ID is required", 400);
    }

    const courseId = validation.data.id;

    const courseExists = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
    if (courseExists.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const assignedLectures = await db
      .select({ lectureId: courseLecture.lectureId })
      .from(courseLecture)
      .where(eq(courseLecture.courseId, courseId));

    const assignedIds = assignedLectures.map((a) => a.lectureId);

    const allLectures = await db.select().from(lecture);

    const availableLectures = allLectures.filter((lec) => !assignedIds.includes(lec.id));

    return ApiSuccess(res, "Available lectures fetched successfully", 200, availableLectures);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const assignLectureToCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(assignLectureSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { courseId, lectureId } = validation.data;

    const courseExists = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
    if (courseExists.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    const existingAssignment = await db
      .select()
      .from(courseLecture)
      .where(and(eq(courseLecture.courseId, courseId), eq(courseLecture.lectureId, lectureId)))
      .limit(1);

    if (existingAssignment.length > 0) {
      return ApiError(res, "Lecture is already assigned to this course", 400);
    }

    const newAssignment = await db.insert(courseLecture).values({ courseId, lectureId }).returning();

    return ApiSuccess(res, "Lecture assigned to course successfully", 201, {
      assignment: newAssignment[0],
      courseName: courseExists[0].courseName,
      lectureTitle: lectureExists[0].title,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const assignMultipleLecturesToCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(bulkAssignLecturesSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { courseId, lectureIds } = validation.data;

    // Verify course exists
    const courseExists = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
    if (courseExists.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const successList: Array<{ lectureId: string; lectureTitle: string }> = [];
    const failedList: Array<{ lectureId: string; reason: string }> = [];

    for (const lectureId of lectureIds) {
      try {
        const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
        if (lectureExists.length === 0) {
          failedList.push({ lectureId, reason: "Lecture not found" });
          continue;
        }

        const existingAssignment = await db
          .select()
          .from(courseLecture)
          .where(and(eq(courseLecture.courseId, courseId), eq(courseLecture.lectureId, lectureId)))
          .limit(1);

        if (existingAssignment.length > 0) {
          failedList.push({ lectureId, reason: "Lecture already assigned to this course" });
          continue;
        }

        await db.insert(courseLecture).values({ courseId, lectureId });
        successList.push({ lectureId, lectureTitle: lectureExists[0].title });
      } catch (error) {
        failedList.push({ lectureId, reason: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return ApiSuccess(
      res,
      `Lecture assignment completed. ${successList.length} assigned, ${failedList.length} failed`,
      201,
      {
        success: successList,
        failed: failedList,
        successCount: successList.length,
        failedCount: failedList.length,
      },
    );
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const removeLectureFromCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ApiError(res, "Assignment ID is required", 400);
    }

    const existingAssignment = await db.select().from(courseLecture).where(eq(courseLecture.id, id)).limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Course-lecture assignment not found", 404);
    }

    await db.delete(courseLecture).where(eq(courseLecture.id, id));

    return ApiSuccess(res, "Lecture removed from course successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const removeLectureFromCourseByIds = async (req: Request, res: Response) => {
  try {
    const { courseId, lectureId } = req.body;

    if (!courseId || !lectureId) {
      return ApiError(res, "courseId and lectureId are required", 400);
    }

    const existingAssignment = await db
      .select()
      .from(courseLecture)
      .where(and(eq(courseLecture.courseId, courseId), eq(courseLecture.lectureId, lectureId)))
      .limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Course-lecture assignment not found", 404);
    }

    await db
      .delete(courseLecture)
      .where(and(eq(courseLecture.courseId, courseId), eq(courseLecture.lectureId, lectureId)));

    return ApiSuccess(res, "Lecture removed from course successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateCourseLecture = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lectureId } = req.body;

    if (!id) {
      return ApiError(res, "Assignment ID is required", 400);
    }

    if (!lectureId) {
      return ApiError(res, "New lectureId is required", 400);
    }

    const existingAssignment = await db.select().from(courseLecture).where(eq(courseLecture.id, id)).limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Course-lecture assignment not found", 404);
    }

    const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
    if (lectureExists.length === 0) {
      return ApiError(res, "New lecture not found", 404);
    }

    const duplicateCheck = await db
      .select()
      .from(courseLecture)
      .where(and(eq(courseLecture.courseId, existingAssignment[0].courseId), eq(courseLecture.lectureId, lectureId)))
      .limit(1);

    if (duplicateCheck.length > 0) {
      return ApiError(res, "This lecture is already assigned to this course", 400);
    }

    const updatedAssignment = await db
      .update(courseLecture)
      .set({ lectureId })
      .where(eq(courseLecture.id, id))
      .returning();

    return ApiSuccess(res, "Course lecture updated successfully", 200, {
      assignment: updatedAssignment[0],
      lectureTitle: lectureExists[0].title,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
