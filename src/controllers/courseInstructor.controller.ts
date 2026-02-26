// Testing Phase Completed
import { and, eq } from "drizzle-orm";
import { Request, Response } from "express";

import { db } from "../db";
import { assignInstructorSchema, bulkAssignInstructorsSchema, idParamSchema, validateSchema } from "./validation";
import { course, courseInstructor, instructor } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

export const getAllCourseInstructors = async (req: Request, res: Response) => {
  try {
    const assignments = await db
      .select({
        id: courseInstructor.id,
        courseName: course.courseName,
        instructorName: instructor.name,
        courseId: courseInstructor.courseId,
        createdAt: courseInstructor.createdAt,
        instructorId: courseInstructor.instructorId,
      })
      .from(courseInstructor)
      .innerJoin(course, eq(courseInstructor.courseId, course.id))
      .innerJoin(instructor, eq(courseInstructor.instructorId, instructor.id));

    return ApiSuccess(res, "Course instructors fetched successfully", 200, assignments);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getInstructorsByCourse = async (req: Request, res: Response) => {
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

    const instructors = await db
      .select({
        id: instructor.id,
        name: instructor.name,
        detail: instructor.detail,
        assignmentId: courseInstructor.id,
      })
      .from(courseInstructor)
      .innerJoin(instructor, eq(courseInstructor.instructorId, instructor.id))
      .where(eq(courseInstructor.courseId, courseId));

    return ApiSuccess(res, "Course instructors fetched successfully", 200, instructors);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCoursesByInstructor = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.instructorId });
    if (!validation.success) {
      return ApiError(res, "Instructor ID is required", 400);
    }

    const instructorId = validation.data.id;

    const instructorExists = await db.select().from(instructor).where(eq(instructor.id, instructorId)).limit(1);
    if (instructorExists.length === 0) {
      return ApiError(res, "Instructor not found", 404);
    }

    const courses = await db
      .select({
        id: course.id,
        courseName: course.courseName,
        courseDetail: course.courseDetail,
        courseImage: course.courseImage,
        assignmentId: courseInstructor.id,
      })
      .from(courseInstructor)
      .innerJoin(course, eq(courseInstructor.courseId, course.id))
      .where(eq(courseInstructor.instructorId, instructorId));

    return ApiSuccess(res, "Instructor courses fetched successfully", 200, courses);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAvailableInstructorsForCourse = async (req: Request, res: Response) => {
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

    const assignedInstructors = await db
      .select({ instructorId: courseInstructor.instructorId })
      .from(courseInstructor)
      .where(eq(courseInstructor.courseId, courseId));

    const assignedIds = assignedInstructors.map((a) => a.instructorId);

    const allInstructors = await db.select().from(instructor);

    const availableInstructors = allInstructors.filter((inst) => !assignedIds.includes(inst.id));

    return ApiSuccess(res, "Available instructors fetched successfully", 200, availableInstructors);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const assignInstructorToCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(assignInstructorSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { courseId, instructorId } = validation.data;

    const courseExists = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
    if (courseExists.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const instructorExists = await db.select().from(instructor).where(eq(instructor.id, instructorId)).limit(1);
    if (instructorExists.length === 0) {
      return ApiError(res, "Instructor not found", 404);
    }

    const existingAssignment = await db
      .select()
      .from(courseInstructor)
      .where(and(eq(courseInstructor.courseId, courseId), eq(courseInstructor.instructorId, instructorId)))
      .limit(1);

    if (existingAssignment.length > 0) {
      return ApiError(res, "Instructor is already assigned to this course", 400);
    }

    const newAssignment = await db.insert(courseInstructor).values({ courseId, instructorId }).returning();

    return ApiSuccess(res, "Instructor assigned to course successfully", 201, {
      assignment: newAssignment[0],
      courseName: courseExists[0].courseName,
      instructorName: instructorExists[0].name,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const assignMultipleInstructorsToCourse = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(bulkAssignInstructorsSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { courseId, instructorIds } = validation.data;

    // Verify course exists
    const courseExists = await db.select().from(course).where(eq(course.id, courseId)).limit(1);
    if (courseExists.length === 0) {
      return ApiError(res, "Course not found", 404);
    }

    const successList: Array<{ instructorId: string; instructorName: string }> = [];
    const failedList: Array<{ instructorId: string; reason: string }> = [];

    for (const instructorId of instructorIds) {
      try {
        // Verify instructor exists
        const instructorExists = await db.select().from(instructor).where(eq(instructor.id, instructorId)).limit(1);
        if (instructorExists.length === 0) {
          failedList.push({ instructorId, reason: "Instructor not found" });
          continue;
        }

        // Check if assignment already exists
        const existingAssignment = await db
          .select()
          .from(courseInstructor)
          .where(and(eq(courseInstructor.courseId, courseId), eq(courseInstructor.instructorId, instructorId)))
          .limit(1);

        if (existingAssignment.length > 0) {
          failedList.push({ instructorId, reason: "Instructor already assigned to this course" });
          continue;
        }

        await db.insert(courseInstructor).values({ courseId, instructorId });
        successList.push({ instructorId, instructorName: instructorExists[0].name });
      } catch (error) {
        failedList.push({ instructorId, reason: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return ApiSuccess(
      res,
      `Instructor assignment completed. ${successList.length} assigned, ${failedList.length} failed`,
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

export const removeInstructorFromCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ApiError(res, "Assignment ID is required", 400);
    }

    const existingAssignment = await db.select().from(courseInstructor).where(eq(courseInstructor.id, id)).limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Course-instructor assignment not found", 404);
    }

    await db.delete(courseInstructor).where(eq(courseInstructor.id, id));

    return ApiSuccess(res, "Instructor removed from course successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const removeInstructorFromCourseByIds = async (req: Request, res: Response) => {
  try {
    const { courseId, instructorId } = req.body;

    if (!courseId || !instructorId) {
      return ApiError(res, "courseId and instructorId are required", 400);
    }

    const existingAssignment = await db
      .select()
      .from(courseInstructor)
      .where(and(eq(courseInstructor.courseId, courseId), eq(courseInstructor.instructorId, instructorId)))
      .limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Course-instructor assignment not found", 404);
    }

    await db
      .delete(courseInstructor)
      .where(and(eq(courseInstructor.courseId, courseId), eq(courseInstructor.instructorId, instructorId)));

    return ApiSuccess(res, "Instructor removed from course successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateCourseInstructor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { instructorId } = req.body;

    if (!id) {
      return ApiError(res, "Assignment ID is required", 400);
    }

    if (!instructorId) {
      return ApiError(res, "New instructorId is required", 400);
    }

    const existingAssignment = await db.select().from(courseInstructor).where(eq(courseInstructor.id, id)).limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Course-instructor assignment not found", 404);
    }

    // Verify new instructor exists
    const instructorExists = await db.select().from(instructor).where(eq(instructor.id, instructorId)).limit(1);
    if (instructorExists.length === 0) {
      return ApiError(res, "New instructor not found", 404);
    }

    // Check if the new instructor is already assigned to this course
    const duplicateCheck = await db
      .select()
      .from(courseInstructor)
      .where(
        and(
          eq(courseInstructor.courseId, existingAssignment[0].courseId),
          eq(courseInstructor.instructorId, instructorId),
        ),
      )
      .limit(1);

    if (duplicateCheck.length > 0) {
      return ApiError(res, "This instructor is already assigned to this course", 400);
    }

    const updatedAssignment = await db
      .update(courseInstructor)
      .set({ instructorId })
      .where(eq(courseInstructor.id, id))
      .returning();

    return ApiSuccess(res, "Course instructor updated successfully", 200, {
      assignment: updatedAssignment[0],
      instructorName: instructorExists[0].name,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
