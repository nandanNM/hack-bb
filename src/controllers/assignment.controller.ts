// Testing Phase Completed
import { and, eq } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import {
  assignmentProgressParamsSchema,
  createAssignmentSchema,
  createBulkAssignmentsSchema,
  idParamSchema,
  updateAssignmentSchema,
  validateSchema,
} from "./validation";
import { user } from "../db/auth-schema";
import {
  assignment,
  assignmentCompleted,
  blockly,
  coding,
  lecture,
  mcq,
  paragraph,
  qna,
  qnaAnswer,
  qnaCompleted,
} from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createAssignmentSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { lectureId, qnaId, difficultyLevel, qnaType, assignmentLevel } = validation.data;

    // Verify lecture and qna exist concurrently
    const [lectureExists, qnaExists] = await Promise.all([
      db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1),
      db.select().from(qna).where(eq(qna.id, qnaId)).limit(1),
    ]);

    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    if (qnaExists.length === 0) {
      return ApiError(res, "QNA not found", 404);
    }

    // Verify qnaType matches the qna record
    if (qnaExists[0].qnaType !== qnaType) {
      return ApiError(res, `QNA type mismatch. Expected ${qnaExists[0].qnaType}, got ${qnaType}`, 400);
    }

    const newAssignment = await db
      .insert(assignment)
      .values({
        lectureId,
        qnaId,
        difficultyLevel,
        qnaType,
        assignmentLevel,
      })
      .returning();

    return ApiSuccess(res, "Assignment created successfully", 201, newAssignment[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createBulkAssignments = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createBulkAssignmentsSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { lectureId, assignments } = validation.data;

    // Verify lecture exists
    const lectureExists = await db.select().from(lecture).where(eq(lecture.id, lectureId)).limit(1);
    if (lectureExists.length === 0) {
      return ApiError(res, "Lecture not found", 404);
    }

    const createdAssignments = [];
    const failedAssignments = [];

    for (const assignmentData of assignments) {
      try {
        const { qnaId, difficultyLevel, qnaType, assignmentLevel } = assignmentData;

        if (!qnaId || !difficultyLevel || !qnaType || assignmentLevel === undefined) {
          failedAssignments.push({ qnaId, reason: "Missing required fields" });
          continue;
        }

        // Verify qna exists
        const qnaExists = await db.select().from(qna).where(eq(qna.id, qnaId)).limit(1);
        if (qnaExists.length === 0) {
          failedAssignments.push({ qnaId, reason: "QNA not found" });
          continue;
        }

        const newAssignment = await db
          .insert(assignment)
          .values({
            lectureId,
            qnaId,
            difficultyLevel,
            qnaType,
            assignmentLevel,
          })
          .returning();

        createdAssignments.push(newAssignment[0]);
      } catch (error) {
        failedAssignments.push({
          qnaId: assignmentData.qnaId,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(res, "Bulk assignment creation completed", 201, {
      created: createdAssignments,
      failed: failedAssignments,
      successCount: createdAssignments.length,
      failedCount: failedAssignments.length,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAssignmentsByLecture = async (req: Request, res: Response) => {
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

    const assignments = await db
      .select({
        id: assignment.id,
        lectureId: assignment.lectureId,
        qnaId: assignment.qnaId,
        difficultyLevel: assignment.difficultyLevel,
        qnaType: assignment.qnaType,
        assignmentLevel: assignment.assignmentLevel,
        createdAt: assignment.createdAt,
      })
      .from(assignment)
      .where(eq(assignment.lectureId, lectureId))
      .orderBy(assignment.assignmentLevel);

    return ApiSuccess(res, "Assignments fetched successfully", 200, {
      lectureId,
      lectureName: lectureExists[0].title,
      totalAssignments: assignments.length,
      assignments,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAssignmentById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const assignmentData = await db.select().from(assignment).where(eq(assignment.id, id)).limit(1);

    if (assignmentData.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    const assignmentRecord = assignmentData[0];

    // 1. Fetch the Answer/Hints data
    const answerData = await db.select().from(qnaAnswer).where(eq(qnaAnswer.qnaId, assignmentRecord.qnaId)).limit(1);

    let specificDetails = null;

    // 2. Fetch specific question details based on type
    if (assignmentRecord.qnaType === "mcq") {
      const mcqData = await db.select().from(mcq).where(eq(mcq.qnaId, assignmentRecord.qnaId)).limit(1);
      specificDetails = mcqData[0] || null;
    } else if (assignmentRecord.qnaType === "coding") {
      const codingData = await db.select().from(coding).where(eq(coding.qnaId, assignmentRecord.qnaId)).limit(1);
      specificDetails = codingData[0] || null;
    } else if (assignmentRecord.qnaType === "paragraph") {
      const paragraphData = await db
        .select()
        .from(paragraph)
        .where(eq(paragraph.qnaId, assignmentRecord.qnaId))
        .limit(1);
      specificDetails = paragraphData[0] || null;
    } else if (assignmentRecord.qnaType === "blockly") {
      const blocklyData = await db.select().from(blockly).where(eq(blockly.qnaId, assignmentRecord.qnaId)).limit(1);
      specificDetails = blocklyData[0] || null;
    }

    const questionDetails = specificDetails ? { ...specificDetails, answer: answerData[0] || null } : null;

    return ApiSuccess(res, "Assignment fetched successfully", 200, {
      ...assignmentRecord,
      questionDetails,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAssignmentWithProgress = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(assignmentProgressParamsSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { assignmentId, studentId: userId } = validation.data;
    const userExists = await db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (userExists.length === 0 || !userExists[0].studentId) {
      return ApiError(res, "User not found", 404);
    }
    const studentId = userExists[0].studentId;
    const assignmentData = await db.select().from(assignment).where(eq(assignment.id, assignmentId)).limit(1);

    if (assignmentData.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    const assignmentRecord = assignmentData[0];

    // Check if student has completed this question

    const qnaCompletedData = await db
      .select()
      .from(qnaCompleted)
      .where(and(eq(qnaCompleted.qnaId, assignmentRecord.qnaId), eq(qnaCompleted.studentId, studentId)))
      .limit(1);

    // Check if assignment is completed
    const assignmentCompletedData = await db
      .select()
      .from(assignmentCompleted)
      .where(and(eq(assignmentCompleted.assignmentId, assignmentId), eq(assignmentCompleted.studentId, studentId)))
      .limit(1);

    // 1. Fetch the Answer/Hints data
    const answerData = await db.select().from(qnaAnswer).where(eq(qnaAnswer.qnaId, assignmentRecord.qnaId)).limit(1);

    let specificDetails = null;

    // 2. Fetch specific question details based on type
    if (assignmentRecord.qnaType === "mcq") {
      const mcqData = await db.select().from(mcq).where(eq(mcq.qnaId, assignmentRecord.qnaId)).limit(1);
      specificDetails = mcqData[0] || null;
    } else if (assignmentRecord.qnaType === "coding") {
      const codingData = await db.select().from(coding).where(eq(coding.qnaId, assignmentRecord.qnaId)).limit(1);
      specificDetails = codingData[0] || null;
    } else if (assignmentRecord.qnaType === "paragraph") {
      const paragraphData = await db
        .select()
        .from(paragraph)
        .where(eq(paragraph.qnaId, assignmentRecord.qnaId))
        .limit(1);
      specificDetails = paragraphData[0] || null;
    } else if (assignmentRecord.qnaType === "blockly") {
      const blocklyData = await db.select().from(blockly).where(eq(blockly.qnaId, assignmentRecord.qnaId)).limit(1);
      specificDetails = blocklyData[0] || null;
    }

    // 3. Merge details with answer data
    const questionDetails = specificDetails ? { ...specificDetails, answer: answerData[0] || null } : null;

    return ApiSuccess(res, "Assignment with progress fetched successfully", 200, {
      ...assignmentRecord,
      questionDetails,
      isQuestionCompleted: qnaCompletedData.length > 0,
      questionStatus: qnaCompletedData.length > 0 ? qnaCompletedData[0].status : null,
      isAssignmentCompleted: assignmentCompletedData.length > 0,
      assignmentStatus: assignmentCompletedData.length > 0 ? assignmentCompletedData[0].status : null,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateAssignment = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateAssignmentSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { difficultyLevel, assignmentLevel } = bodyValidation.data;

    const existingAssignment = await db.select().from(assignment).where(eq(assignment.id, id)).limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    const updateData: Record<string, string | number> = {};
    if (difficultyLevel !== undefined) {
      updateData.difficultyLevel = difficultyLevel;
    }
    if (assignmentLevel !== undefined) {
      updateData.assignmentLevel = assignmentLevel;
    }

    if (Object.keys(updateData).length === 0) {
      return ApiError(res, "No valid fields to update", 400);
    }

    const updatedAssignment = await db.update(assignment).set(updateData).where(eq(assignment.id, id)).returning();

    return ApiSuccess(res, "Assignment updated successfully", 200, updatedAssignment[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingAssignment = await db.select().from(assignment).where(eq(assignment.id, id)).limit(1);

    if (existingAssignment.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    await db.delete(assignment).where(eq(assignment.id, id));

    return ApiSuccess(res, "Assignment deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllAssignments = async (req: Request, res: Response) => {
  try {
    const assignments = await db
      .select({
        id: assignment.id,
        lectureId: assignment.lectureId,
        lectureTitle: lecture.title,
        qnaId: assignment.qnaId,
        difficultyLevel: assignment.difficultyLevel,
        qnaType: assignment.qnaType,
        assignmentLevel: assignment.assignmentLevel,
        createdAt: assignment.createdAt,
      })
      .from(assignment)
      .innerJoin(lecture, eq(assignment.lectureId, lecture.id))
      .orderBy(lecture.title, assignment.assignmentLevel);

    return ApiSuccess(res, "All assignments fetched successfully", 200, assignments);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
