// Testing Phase Completed
import { eq } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import { createCommentSchema, idParamSchema, updateCommentSchema, validateSchema } from "./validation";
import { user } from "../db/auth-schema";
import { assignment, comment, student } from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

export const createComment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.studentId) {
      return ApiError(res, "Unauthorized - Student authentication required", 401);
    }

    const validation = validateSchema(createCommentSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { assignmentId, content } = validation.data;
    const studentId = req.user.studentId;

    const assignmentExists = await db.select().from(assignment).where(eq(assignment.id, assignmentId)).limit(1);

    if (assignmentExists.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    const newComment = await db
      .insert(comment)
      .values({
        assignmentId,
        studentId,
        content: content.trim(),
      })
      .returning();

    return ApiSuccess(res, "Comment created successfully", 201, newComment[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCommentsByAssignment = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.assignmentId });
    if (!validation.success) {
      return ApiError(res, "assignmentId is required", 400);
    }

    const assignmentId = validation.data.id;

    const assignmentExists = await db.select().from(assignment).where(eq(assignment.id, assignmentId)).limit(1);

    if (assignmentExists.length === 0) {
      return ApiError(res, "Assignment not found", 404);
    }

    const comments = await db
      .select({
        id: comment.id,
        content: comment.content,
        studentId: comment.studentId,
        studentName: user.name,
        studentImage: user.image,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })
      .from(comment)
      .innerJoin(student, eq(comment.studentId, student.id))
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(comment.assignmentId, assignmentId))
      .orderBy(comment.createdAt);

    return ApiSuccess(res, "Comments fetched successfully", 200, {
      assignmentId,
      totalComments: comments.length,
      comments,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCommentsByStudent = async (req: Request, res: Response) => {
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

    const comments = await db
      .select({
        id: comment.id,
        content: comment.content,
        assignmentId: comment.assignmentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })
      .from(comment)
      .where(eq(comment.studentId, studentId))
      .orderBy(comment.createdAt);

    return ApiSuccess(res, "Student comments fetched successfully", 200, {
      studentId,
      totalComments: comments.length,
      comments,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.studentId) {
      return ApiError(res, "Unauthorized - Student authentication required", 401);
    }

    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateCommentSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { content } = bodyValidation.data;
    const studentId = req.user.studentId;

    const existingComment = await db.select().from(comment).where(eq(comment.id, id)).limit(1);

    if (existingComment.length === 0) {
      return ApiError(res, "Comment not found", 404);
    }

    if (existingComment[0].studentId !== studentId) {
      return ApiError(res, "You can only edit your own comments", 403);
    }

    const updatedComment = await db
      .update(comment)
      .set({ content: content.trim() })
      .where(eq(comment.id, id))
      .returning();

    return ApiSuccess(res, "Comment updated successfully", 200, updatedComment[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return ApiError(res, "Unauthorized - Authentication required", 401);
    }

    const { id } = req.params;

    if (!id) {
      return ApiError(res, "Comment ID is required", 400);
    }

    // Fetch the comment with student information to check school
    const commentData = await db
      .select({
        comment: comment,
        studentSchoolId: user.schoolId,
      })
      .from(comment)
      .innerJoin(student, eq(comment.studentId, student.id))
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(comment.id, id))
      .limit(1);

    if (commentData.length === 0) {
      return ApiError(res, "Comment not found", 404);
    }

    const existingComment = commentData[0].comment;
    const commentSchoolId = commentData[0].studentSchoolId;
    const userRole = req.user.role;
    const userSchoolId = req.user.schoolId;
    const userStudentId = req.user.studentId;

    // Authorization check:
    // 1. Super admin can delete any comment
    // 2. Admin can delete comments from their school
    // 3. Student can delete their own comments
    const isSuperAdmin = userRole === "superAdmin";
    const isSchoolAdmin = userRole === "admin" && userSchoolId === commentSchoolId;
    const isCommentOwner = userStudentId && existingComment.studentId === userStudentId;

    if (!isSuperAdmin && !isSchoolAdmin && !isCommentOwner) {
      return ApiError(res, "You don't have permission to delete this comment", 403);
    }

    await db.delete(comment).where(eq(comment.id, id));

    return ApiSuccess(res, "Comment deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCommentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return ApiError(res, "Comment ID is required", 400);
    }

    const commentData = await db
      .select({
        id: comment.id,
        content: comment.content,
        assignmentId: comment.assignmentId,
        studentId: comment.studentId,
        studentName: user.name,
        studentImage: user.image,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      })
      .from(comment)
      .innerJoin(student, eq(comment.studentId, student.id))
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(comment.id, id))
      .limit(1);

    if (commentData.length === 0) {
      return ApiError(res, "Comment not found", 404);
    }

    return ApiSuccess(res, "Comment fetched successfully", 200, commentData[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getCommentCount = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return ApiError(res, "assignmentId is required", 400);
    }

    const comments = await db.select().from(comment).where(eq(comment.assignmentId, assignmentId));

    return ApiSuccess(res, "Comment count fetched successfully", 200, {
      assignmentId,
      count: comments.length,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
