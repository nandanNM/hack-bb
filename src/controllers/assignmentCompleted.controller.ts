// Testing Phase Completed
import { and, eq } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import { assignmentCompletionParamsSchema, idParamSchema, validateSchema } from "./validation";
import { user } from "../db/auth-schema";
import { assignment, assignmentCompleted, lecture, student } from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

export const getAssignmentCompletionStatus = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(assignmentCompletionParamsSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { studentId, assignmentId } = validation.data;

    const completionStatus = await db
      .select()
      .from(assignmentCompleted)
      .where(and(eq(assignmentCompleted.studentId, studentId), eq(assignmentCompleted.assignmentId, assignmentId)))
      .limit(1);

    if (completionStatus.length === 0) {
      return ApiSuccess(res, "Assignment not attempted yet", 200, {
        isCompleted: false,
        status: null,
      });
    }

    return ApiSuccess(res, "Assignment completion status fetched", 200, {
      ...completionStatus[0],
      isCompleted: completionStatus[0].status === "completed",
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentCompletedAssignments = async (req: Request, res: Response) => {
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

    const completedAssignments = await db
      .select({
        id: assignmentCompleted.id,
        assignmentId: assignmentCompleted.assignmentId,
        status: assignmentCompleted.status,
        completedAt: assignmentCompleted.updatedAt,
        lectureId: assignment.lectureId,
        lectureTitle: lecture.title,
        difficultyLevel: assignment.difficultyLevel,
        qnaType: assignment.qnaType,
        assignmentLevel: assignment.assignmentLevel,
      })
      .from(assignmentCompleted)
      .innerJoin(assignment, eq(assignmentCompleted.assignmentId, assignment.id))
      .innerJoin(lecture, eq(assignment.lectureId, lecture.id))
      .where(eq(assignmentCompleted.studentId, studentId))
      .orderBy(assignmentCompleted.updatedAt);

    const stats = {
      total: completedAssignments.length,
      completed: completedAssignments.filter((a) => a.status === "completed").length,
      inProgress: completedAssignments.filter((a) => a.status === "inProgress").length,
      pending: completedAssignments.filter((a) => a.status === "pending").length,
    };

    return ApiSuccess(res, "Student completed assignments fetched successfully", 200, {
      studentId,
      stats,
      assignments: completedAssignments,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentOverallProgress = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.studentId });
    if (!validation.success) {
      return ApiError(res, "studentId is required", 400);
    }

    const userId = validation.data.id;

    const userExists = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (userExists.length === 0 || !userExists[0].studentId) {
      return ApiError(res, "User not found", 404);
    }
    const studentId = userExists[0].studentId;
    const studentExists = await db.select().from(student).where(eq(student.id, studentId)).limit(1);
    if (studentExists.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    // Get all lectures with assignments
    const allLectures = await db
      .select({
        lectureId: lecture.id,
        lectureTitle: lecture.title,
      })
      .from(lecture)
      .innerJoin(assignment, eq(lecture.id, assignment.lectureId));

    // Get unique lecture IDs
    const uniqueLectureIds = [...new Set(allLectures.map((l) => l.lectureId))];

    // For each lecture, calculate progress
    const lectureProgress = await Promise.all(
      uniqueLectureIds.map(async (lectureId) => {
        const lectureData = allLectures.find((l) => l.lectureId === lectureId);

        // Get total assignments for this lecture
        const totalAssignments = await db.select().from(assignment).where(eq(assignment.lectureId, lectureId));

        // Get completed assignments for this lecture
        const completedAssignments = await db
          .select()
          .from(assignmentCompleted)
          .innerJoin(assignment, eq(assignmentCompleted.assignmentId, assignment.id))
          .where(
            and(
              eq(assignment.lectureId, lectureId),
              eq(assignmentCompleted.studentId, studentId),
              eq(assignmentCompleted.status, "completed"),
            ),
          );

        const progress =
          totalAssignments.length > 0 ? Math.round((completedAssignments.length / totalAssignments.length) * 100) : 0;

        return {
          lectureId,
          lectureTitle: lectureData?.lectureTitle,
          totalAssignments: totalAssignments.length,
          completedAssignments: completedAssignments.length,
          progress,
          isCompleted: progress === 100,
        };
      }),
    );

    const overallStats = {
      totalLectures: lectureProgress.length,
      completedLectures: lectureProgress.filter((l) => l.isCompleted).length,
      overallProgress:
        lectureProgress.length > 0
          ? Math.round(lectureProgress.reduce((sum, l) => sum + l.progress, 0) / lectureProgress.length)
          : 0,
    };

    return ApiSuccess(res, "Student overall progress fetched successfully", 200, {
      studentId,
      overallStats,
      lectureProgress,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAssignmentCompletionAnalytics = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return ApiError(res, "assignmentId is required", 400);
    }

    const assignmentExists = await db.select().from(assignment).where(eq(assignment.id, assignmentId)).limit(1);

    if (assignmentExists.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    const completions = await db
      .select({
        id: assignmentCompleted.id,
        studentId: assignmentCompleted.studentId,
        studentName: user.name,
        studentEmail: user.email,
        status: assignmentCompleted.status,
        completedAt: assignmentCompleted.updatedAt,
      })
      .from(assignmentCompleted)
      .innerJoin(student, eq(assignmentCompleted.studentId, student.id))
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(assignmentCompleted.assignmentId, assignmentId))
      .orderBy(assignmentCompleted.updatedAt);

    return ApiSuccess(res, "Assignment completion analytics fetched", 200, {
      assignmentId,
      totalCompletions: completions.length,
      completedCount: completions.filter((c) => c.status === "completed").length,
      completions,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getLectureCompletionAnalytics = async (req: Request, res: Response) => {
  try {
    const { lectureId } = req.params;

    if (!lectureId) {
      return ApiError(res, "lectureId is required", 400);
    }

    const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    // Get all assignments for this lecture
    const lectureAssignments = await db.select().from(assignment).where(eq(assignment.lectureId, lectureId));

    if (lectureAssignments.length === 0) {
      return ApiSuccess(res, "No assignments found for this lecture", 200, {
        lectureId,
        lectureName: lectureExists[0].title,
        totalAssignments: 0,
        studentProgress: [],
      });
    }

    // Get all completions for these assignments
    const allCompletions = await db
      .select({
        studentId: assignmentCompleted.studentId,
        studentName: user.name,
        assignmentId: assignmentCompleted.assignmentId,
        status: assignmentCompleted.status,
      })
      .from(assignmentCompleted)
      .innerJoin(student, eq(assignmentCompleted.studentId, student.id))
      .innerJoin(user, eq(user.studentId, student.id))
      .innerJoin(assignment, eq(assignmentCompleted.assignmentId, assignment.id))
      .where(eq(assignment.lectureId, lectureId));

    // Group by student
    const studentMap = new Map<string, { name: string; completed: number; total: number }>();

    for (const completion of allCompletions) {
      if (!studentMap.has(completion.studentId)) {
        studentMap.set(completion.studentId, {
          name: completion.studentName,
          completed: 0,
          total: lectureAssignments.length,
        });
      }
      if (completion.status === "completed") {
        const studentData = studentMap.get(completion.studentId)!;
        studentData.completed++;
      }
    }

    const studentProgress = Array.from(studentMap.entries()).map(([studentId, data]) => ({
      studentId,
      studentName: data.name,
      completedAssignments: data.completed,
      totalAssignments: data.total,
      progress: Math.round((data.completed / data.total) * 100),
      isLectureCompleted: data.completed === data.total,
    }));

    return ApiSuccess(res, "Lecture completion analytics fetched", 200, {
      lectureId,
      lectureName: lectureExists[0].title,
      totalAssignments: lectureAssignments.length,
      totalStudentsAttempted: studentProgress.length,
      studentsCompleted: studentProgress.filter((s) => s.isLectureCompleted).length,
      studentProgress,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
