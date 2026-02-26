// Testing Phase Complete
import { and, desc, eq, inArray } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import {
  markQnaCompletedSchema,
  markQnaInProgressSchema,
  qnaCompletionParamsSchema,
  studentIdParamSchema,
  studentLectureParamsSchema,
  validateSchema,
} from "./validation";
import { user } from "../db/auth-schema";
import { assignment, assignmentCompleted, qna, qnaCompleted, student } from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

const checkAndCompleteAssignment = async (studentId: string, lectureId: string) => {
  const lectureAssignments = await db.select().from(assignment).where(eq(assignment.lectureId, lectureId));

  if (lectureAssignments.length === 0) {
    return null;
  }

  const qnaIds = lectureAssignments.map((a) => a.qnaId);
  const completedQnas = await db
    .select()
    .from(qnaCompleted)
    .where(
      and(
        eq(qnaCompleted.studentId, studentId),
        inArray(qnaCompleted.qnaId, qnaIds),
        eq(qnaCompleted.status, "completed"),
      ),
    );

  if (completedQnas.length === qnaIds.length) {
    for (const assignmentRecord of lectureAssignments) {
      const existingCompletion = await db
        .select()
        .from(assignmentCompleted)
        .where(
          and(eq(assignmentCompleted.assignmentId, assignmentRecord.id), eq(assignmentCompleted.studentId, studentId)),
        )
        .limit(1);

      if (existingCompletion.length === 0) {
        await db.insert(assignmentCompleted).values({
          assignmentId: assignmentRecord.id,
          studentId,
          status: "completed",
        });
      } else if (existingCompletion[0].status !== "completed") {
        await db
          .update(assignmentCompleted)
          .set({ status: "completed" })
          .where(eq(assignmentCompleted.id, existingCompletion[0].id));
      }
    }
    return true;
  }

  return false;
};

export const markQnaCompleted = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.studentId) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }
    const studentId = req.user.studentId;
    const validation = validateSchema(markQnaCompletedSchema, req.body);

    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { qnaId, status: qnaStatus } = validation.data;

    const studentExists = await db.select().from(student).where(eq(student.id, studentId)).limit(1);
    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    const qnaExists = await db.select().from(qna).where(eq(qna.id, qnaId)).limit(1);
    if (qnaExists.length === 0) {
      return ApiError(res, "QNA not found", 404);
    }

    const existingCompletion = await db
      .select()
      .from(qnaCompleted)
      .where(and(eq(qnaCompleted.studentId, studentId), eq(qnaCompleted.qnaId, qnaId)))
      .limit(1);

    if (existingCompletion.length > 0 && existingCompletion[0].status === "completed") {
      return ApiError(res, "This question has already been completed and cannot be resubmitted", 400);
    }

    let result;

    if (existingCompletion.length > 0) {
      result = await db
        .update(qnaCompleted)
        .set({ status: qnaStatus })
        .where(eq(qnaCompleted.id, existingCompletion[0].id))
        .returning();
    } else {
      // Create new completion record
      result = await db
        .insert(qnaCompleted)
        .values({
          studentId,
          qnaId,
          status: qnaStatus,
        })
        .returning();
    }

    // If marked as completed, check if all assignment questions are done
    let assignmentAutoCompleted = false;
    if (qnaStatus === "completed") {
      // Find assignments using this qna
      const relatedAssignments = await db.select().from(assignment).where(eq(assignment.qnaId, qnaId));

      for (const assignmentRecord of relatedAssignments) {
        const completed = await checkAndCompleteAssignment(studentId, assignmentRecord.lectureId);
        if (completed) {
          assignmentAutoCompleted = true;
        }
      }
    }

    return ApiSuccess(res, "QNA completion status updated successfully", 200, {
      ...result[0],
      assignmentAutoCompleted,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getQnaCompletionStatus = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(qnaCompletionParamsSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { studentId: userId, qnaId } = validation.data;
    const userRecord = await db.select({ studentId: user.studentId }).from(user).where(eq(user.id, userId)).limit(1);

    if (userRecord.length === 0 || !userRecord[0].studentId) {
      return ApiError(res, "Student not found for this user", 404);
    }

    const studentId = userRecord[0].studentId;

    const completionStatus = await db
      .select()
      .from(qnaCompleted)
      .where(and(eq(qnaCompleted.studentId, studentId), eq(qnaCompleted.qnaId, qnaId)))
      .limit(1);

    if (completionStatus.length === 0) {
      return ApiSuccess(res, "QNA not attempted yet", 200, {
        isCompleted: false,
        status: null,
        canSubmit: true,
      });
    }

    return ApiSuccess(res, "QNA completion status fetched", 200, {
      ...completionStatus[0],
      isCompleted: completionStatus[0].status === "completed",
      canSubmit: completionStatus[0].status !== "completed",
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentCompletedQnas = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(studentIdParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { studentId } = validation.data;

    const studentExists = await db.select().from(student).where(eq(student.id, studentId)).limit(1);
    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    const completedQnas = await db
      .select({
        id: qnaCompleted.id,
        qnaId: qnaCompleted.qnaId,
        qnaType: qna.qnaType,
        status: qnaCompleted.status,
        completedAt: qnaCompleted.updatedAt,
      })
      .from(qnaCompleted)
      .innerJoin(qna, eq(qnaCompleted.qnaId, qna.id))
      .where(eq(qnaCompleted.studentId, studentId))
      .orderBy(desc(qnaCompleted.updatedAt));

    const stats = {
      total: completedQnas.length,
      completed: completedQnas.filter((q) => q.status === "completed").length,
      inProgress: completedQnas.filter((q) => q.status === "inProgress").length,
      pending: completedQnas.filter((q) => q.status === "pending").length,
    };

    return ApiSuccess(res, "Student completed QNAs fetched successfully", 200, {
      studentId,
      stats,
      qnas: completedQnas,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in getStudentCompletedQnas:", error);
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentLectureProgress = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(studentLectureParamsSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { studentId: userId, lectureId } = validation.data;

    // Get all assignments for this lecture

    const lectureAssignments = await db
      .select()
      .from(assignment)
      .where(eq(assignment.lectureId, lectureId))
      .orderBy(assignment.assignmentLevel);
    const userRecord = await db.select({ studentId: user.studentId }).from(user).where(eq(user.id, userId)).limit(1);

    if (userRecord.length === 0 || !userRecord[0].studentId) {
      return ApiError(res, "Student not found for this user", 404);
    }

    const studentId = userRecord[0].studentId;

    if (lectureAssignments.length === 0) {
      return ApiSuccess(res, "No assignments found for this lecture", 200, {
        lectureId,
        totalQuestions: 0,
        completedQuestions: 0,
        progress: 0,
        assignments: [],
      });
    }

    // Get qna completion status for each assignment
    const assignmentsWithProgress = await Promise.all(
      lectureAssignments.map(async (assignmentRecord) => {
        const qnaCompletion = await db
          .select()
          .from(qnaCompleted)
          .where(and(eq(qnaCompleted.studentId, studentId), eq(qnaCompleted.qnaId, assignmentRecord.qnaId)))
          .limit(1);

        return {
          ...assignmentRecord,
          isCompleted: qnaCompletion.length > 0 && qnaCompletion[0].status === "completed",
          status: qnaCompletion.length > 0 ? qnaCompletion[0].status : null,
          canSubmit: qnaCompletion.length === 0 || qnaCompletion[0].status !== "completed",
        };
      }),
    );

    const completedCount = assignmentsWithProgress.filter((a) => a.isCompleted).length;
    const progress = Math.round((completedCount / lectureAssignments.length) * 100);

    return ApiSuccess(res, "Student lecture progress fetched successfully", 200, {
      lectureId,
      studentId,
      totalQuestions: lectureAssignments.length,
      completedQuestions: completedCount,
      progress,
      isLectureCompleted: completedCount === lectureAssignments.length,
      assignments: assignmentsWithProgress,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const markQnaInProgress = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.studentId) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }
    const studentId = req.user.studentId;
    const validation = validateSchema(markQnaInProgressSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }
    const { qnaId } = validation.data;

    // Verify student exists
    const studentExists = await db.select().from(student).where(eq(student.id, studentId)).limit(1);
    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    // Verify qna exists
    const qnaExists = await db.select().from(qna).where(eq(qna.id, qnaId)).limit(1);
    if (qnaExists.length === 0) {
      return ApiError(res, "QNA not found", 404);
    }

    // Check if already completed - cannot change status
    const existingCompletion = await db
      .select()
      .from(qnaCompleted)
      .where(and(eq(qnaCompleted.studentId, studentId), eq(qnaCompleted.qnaId, qnaId)))
      .limit(1);

    if (existingCompletion.length > 0 && existingCompletion[0].status === "completed") {
      return ApiError(res, "This question has already been completed", 400);
    }

    let result;

    if (existingCompletion.length > 0) {
      result = await db
        .update(qnaCompleted)
        .set({ status: "inProgress" })
        .where(eq(qnaCompleted.id, existingCompletion[0].id))
        .returning();
    } else {
      result = await db
        .insert(qnaCompleted)
        .values({
          studentId,
          qnaId,
          status: "inProgress",
        })
        .returning();
    }

    return ApiSuccess(res, "QNA marked as in progress", 200, result[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
