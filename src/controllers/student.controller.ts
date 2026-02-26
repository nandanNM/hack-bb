// Testing Phase Complete
import { eq } from "drizzle-orm";
import { Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import {
  createStudentCSVSchema,
  createStudentSchema,
  idParamSchema,
  passwordChangeSchema,
  studentCSVRowSchema,
  updateStudentSchema,
  validateSchema,
} from "./validation";
import { account, user } from "../db/auth-schema";
import { school, schoolStudent, student } from "../db/schema";
import { sendMail } from "../services/mail.service";
import { passwordCompare, passwordGenerator, passwordHasher } from "../services/password.service";
import { AuthenticatedRequest, TenantRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";
import { CSVStudentRow } from "./validation/types";

type Request = AuthenticatedRequest & TenantRequest;

export const createStudentCSV = async (req: Request, res: Response) => {
  try {
    // get a file from multer
    // save it temporarily on server then read it
    const file = req.file;
    if (!file) {
      return ApiError(res, "No file uploaded", 400);
    }

    const csv = file.buffer.toString("utf8");
    const { data, errors } = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });

    // make sure csv parsing errors are handled as well
    if (errors.length) {
      return ApiError(res, "CSV parse error", 400);
    }

    const validation = validateSchema(createStudentCSVSchema, req.body);

    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { schoolId: defaultSchoolId } = validation.data;

    const isIndividual = defaultSchoolId === undefined;
    const role = isIndividual ? "individual" : "school";
    const targetSchoolId = isIndividual ? null : defaultSchoolId;

    // school id is needed to make sure we add students for that school
    if (!isIndividual) {
      if (!targetSchoolId) {
        return ApiError(res, "School students must have a school selected", 400);
      }

      const schoolExists = await db.select().from(school).where(eq(school.id, targetSchoolId)).limit(1);
      if (schoolExists.length === 0) {
        return ApiError(res, "Invalid school ID", 400);
      }
    }

    // Those arrays are request-scoped, in-memory variables.
    // They exist only for the lifetime of a single HTTP request.
    // no need ofr in memory db or caching here
    const failedStudents = [];
    const createdStudents = [];

    for (const std of data as CSVStudentRow[]) {
      try {
        const rowValidation = validateSchema(studentCSVRowSchema, std);
        if (!rowValidation.success) {
          failedStudents.push({
            email: std.email || "unknown",
            reason: rowValidation.error,
          });
          continue;
        }

        const { name, email, class: studentClass, picture, level: levelStr } = rowValidation.data;
        const level = Number(levelStr) || 0;

        const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

        if (existingUser.length > 0) {
          failedStudents.push({
            email,
            reason: "User with this email already exists in authentication system",
          });
          continue;
        }

        const password = passwordGenerator(email);

        // already js is slow, so making it as concurrent as possible
        const [hashedPassword, newStudent] = await Promise.all([
          passwordHasher(password),
          db
            .insert(student)
            .values({
              role: role,
              level: level,
              class: studentClass,
            })
            .returning(),
        ]);

        const newUser = await db
          .insert(user)
          .values({
            name: name,
            email: email,
            emailVerified: false,
            image: picture ?? undefined,
            role: role,
            schoolId: targetSchoolId,
            studentId: newStudent[0].id,
            isActive: true,
          })
          .returning();

        const promises: Promise<unknown>[] = [
          db.insert(account).values({
            accountId: newUser[0].id,
            providerId: "credential",
            userId: newUser[0].id,
            password: hashedPassword,
          }),
        ];

        if (!isIndividual && targetSchoolId) {
          promises.push(
            db.insert(schoolStudent).values({
              schoolId: targetSchoolId,
              studentId: newStudent[0].id,
            }),
          );
        }

        await Promise.all(promises);

        sendMail({
          mail: [email],
          subject: "Your Account Password",
          text: `Your password is: ${password}`,
          html: `<p>Your student account has been created.</p><p>Your password is: <strong>${password}</strong></p>`,
        }).catch(() => {});

        createdStudents.push({ email, name, role });
      } catch (error) {
        failedStudents.push({
          email: std.email,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(
      res,
      `Student creation process completed. ${createdStudents.length} created, ${failedStudents.length} failed`,
      201,
      {
        failed: failedStudents,
        created: createdStudents,
        failedCount: failedStudents.length,
        successCount: createdStudents.length,
      },
    );
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const studentPasswordChange = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.studentId) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    const validation = validateSchema(passwordChangeSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { oldPassword, newPassword } = validation.data;

    const existingStudent = await db.select().from(student).where(eq(student.id, req.user.studentId)).limit(1);
    if (existingStudent.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    const userAccount = await db.select().from(account).where(eq(account.userId, req.user.id)).limit(1);
    if (userAccount.length === 0) {
      return ApiError(res, "Account not found", 404);
    }

    const accountData = userAccount[0];
    const isOldPasswordValid = await passwordCompare(oldPassword, accountData.password || "");
    if (!isOldPasswordValid) {
      return ApiError(res, "Old password is incorrect", 401);
    }

    const hashedNewPassword = await passwordHasher(newPassword);
    await db.update(account).set({ password: hashedNewPassword }).where(eq(account.userId, req.user.id));

    return ApiSuccess(res, "Password changed successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createStudentSchema, req.body);

    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }
    const { name, email, role: studentRole, level, class: studentClass, picture, schoolId } = validation.data;

    // Validate role is either 'school' or 'individual'
    if (studentRole === "school" && !schoolId) {
      return ApiError(res, "School students must have a schoolId", 400);
    }

    if (studentRole === "individual" && schoolId) {
      return ApiError(res, "Individual students cannot be assigned to a school", 400);
    }

    if (req.adminSchoolId) {
      if (studentRole === "individual") {
        return ApiError(res, "Admins can only create school students", 403);
      }
      if (schoolId !== req.adminSchoolId) {
        return ApiError(res, "Forbidden: You can only create students for your own school", 403);
      }
    }

    let targetSchoolId: string | null = null;

    // Run school validation and user existence check concurrently
    const [schoolExists, existingUser] = await Promise.all([
      schoolId ? db.select().from(school).where(eq(school.id, schoolId)).limit(1) : Promise.resolve([{ id: null }]),
      db.select().from(user).where(eq(user.email, email)).limit(1),
    ]);

    if (schoolId && schoolExists.length === 0) {
      return ApiError(res, "Invalid school ID", 400);
    }

    if (existingUser.length > 0) {
      return ApiError(res, "User with this email already exists in authentication system", 400);
    }

    if (schoolId) {
      targetSchoolId = schoolId;
    }

    const password = passwordGenerator(email);

    // already js is slow, so making it as concurrent as possible
    const [hashedPassword, newStudent] = await Promise.all([
      passwordHasher(password),
      db
        .insert(student)
        .values({
          role: studentRole,
          level: Number(level) || 0,
          class: studentClass,
        })
        .returning(),
    ]);

    const newUser = await db
      .insert(user)
      .values({
        name,
        email,
        emailVerified: false,
        image: picture,
        role: studentRole,
        schoolId: targetSchoolId,
        studentId: newStudent[0].id,
        isActive: true,
      })
      .returning();

    const promises: Promise<unknown>[] = [
      db.insert(account).values({
        accountId: newUser[0].id,
        providerId: "credential",
        userId: newUser[0].id,
        password: hashedPassword,
      }),
    ];

    if (studentRole === "school" && targetSchoolId) {
      promises.push(
        db.insert(schoolStudent).values({
          schoolId: targetSchoolId,
          studentId: newStudent[0].id,
        }),
      );
    }

    await Promise.all(promises);

    // mail should NOT block request or affect DB success
    sendMail({
      mail: [email],
      subject: "Your Account Password",
      text: `Your password is: ${password}`,
      html: `<p>Your password is: <strong>${password}</strong></p>`,
    }).catch(() => {});

    return ApiSuccess(res, "Student created successfully", 201);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);
    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;

    const bodyValidation = validateSchema(updateStudentSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { name, level, class: studentClass, imageUrl } = bodyValidation.data;

    // Run validation checks concurrently
    const [existingStudent, studentSchoolRelation] = await Promise.all([
      db.select().from(student).where(eq(student.id, id)).limit(1),
      req.adminSchoolId
        ? db.select().from(schoolStudent).where(eq(schoolStudent.studentId, id)).limit(1)
        : Promise.resolve([]),
    ]);

    if (existingStudent.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    if (req.adminSchoolId) {
      if (studentSchoolRelation.length === 0 || studentSchoolRelation[0].schoolId !== req.adminSchoolId) {
        return ApiError(res, "Forbidden: You can only update students from your own school", 403);
      }
    }

    const updateData: Record<string, string | number> = {};
    if (level !== undefined) updateData.level = Number(level);
    if (studentClass) updateData.class = studentClass;

    // Update user table with name and image
    const userUpdateData: Record<string, string> = {};
    if (name) userUpdateData.name = name;
    if (imageUrl) userUpdateData.image = imageUrl;

    if (Object.keys(updateData).length === 0 && Object.keys(userUpdateData).length === 0) {
      return ApiError(res, "No fields to update", 400);
    }

    // Update both student and user tables concurrently if there are fields to update
    const updatePromises: Promise<unknown>[] = [];

    if (Object.keys(updateData).length > 0) {
      updatePromises.push(db.update(student).set(updateData).where(eq(student.id, id)));
    }

    if (Object.keys(userUpdateData).length > 0) {
      updatePromises.push(db.update(user).set(userUpdateData).where(eq(user.studentId, id)));
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    // Fetch updated student with user info
    const updatedStudent = await db
      .select({
        id: student.id,
        name: user.name,
        email: user.email,
        level: student.level,
        role: student.role,
        class: student.class,
        imageUrl: user.image,
        createdAt: student.createdAt,
      })
      .from(student)
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(student.id, id))
      .limit(1);

    return ApiSuccess(res, "Student updated successfully", 200, updatedStudent[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingStudent = await db.select().from(student).where(eq(student.id, id)).limit(1);

    if (existingStudent.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    // Delete the student - this will cascade to:
    // - user table (onDelete: cascade on studentId)
    // - account table (onDelete: cascade on userId)
    // - schoolStudent, assignmentCompleted, qnaCompleted, lectureWatched, comment (schema cascades)
    await db.delete(student).where(eq(student.id, id));

    return ApiSuccess(res, "Student deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    // If admin (not superAdmin), ensure they can only view students from their school
    if (req.adminSchoolId) {
      const studentSchoolRelation = await db
        .select()
        .from(schoolStudent)
        .where(eq(schoolStudent.studentId, id))
        .limit(1);

      if (studentSchoolRelation.length === 0 || studentSchoolRelation[0].schoolId !== req.adminSchoolId) {
        return ApiError(res, "Forbidden: You can only view students from your own school", 403);
      }
    }

    const existingStudent = await db
      .select({
        id: student.id,
        name: user.name,
        email: user.email,
        level: student.level,
        role: student.role,
        class: student.class,
        imageUrl: user.image,
        createdAt: student.createdAt,
      })
      .from(student)
      .innerJoin(user, eq(user.studentId, student.id))
      .where(eq(student.id, id))
      .limit(1);

    if (existingStudent.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    return ApiSuccess(res, "Student fetched successfully", 200, existingStudent[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllStudents = async (req: Request, res: Response) => {
  try {
    // If admin (not superAdmin), redirect to school-specific query
    if (req.adminSchoolId) {
      // Admin can only see students from their school
      const schoolStudents = await db
        .select({
          id: student.id,
          name: user.name,
          email: user.email,
          level: student.level,
          role: student.role,
          class: student.class,
          imageUrl: user.image,
          createdAt: student.createdAt,
          banned: user.banned,
          banReason: user.banReason,
          banExpires: user.banExpires,
        })
        .from(schoolStudent)
        .innerJoin(student, eq(schoolStudent.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .where(eq(schoolStudent.schoolId, req.adminSchoolId));
      return ApiSuccess(res, "Students fetched successfully", 200, schoolStudents);
    }

    const studentsWithBanStatus = await db
      .select({
        id: student.id,
        name: user.name,
        email: user.email,
        level: student.level,
        role: student.role,
        class: student.class,
        imageUrl: user.image,
        createdAt: student.createdAt,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        schoolId: user.schoolId,
      })
      .from(student)
      .innerJoin(user, eq(user.studentId, student.id));
    return ApiSuccess(res, "Students fetched successfully", 200, studentsWithBanStatus);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentsBySchool = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.schoolId });
    if (!validation.success) {
      return ApiError(res, "School ID is required", 400);
    }

    const schoolId = validation.data.id;

    if (req.adminSchoolId && req.adminSchoolId !== schoolId) {
      return ApiError(res, "Forbidden: You can only access students from your own school", 403);
    }

    const [schoolExists, schoolStudents] = await Promise.all([
      db.select().from(school).where(eq(school.id, schoolId)).limit(1),
      db
        .select({
          id: student.id,
          name: user.name,
          email: user.email,
          level: student.level,
          role: student.role,
          class: student.class,
          imageUrl: user.image,
          createdAt: student.createdAt,
          banned: user.banned,
          banReason: user.banReason,
          banExpires: user.banExpires,
        })
        .from(schoolStudent)
        .innerJoin(student, eq(schoolStudent.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .where(eq(schoolStudent.schoolId, schoolId)),
    ]);

    if (schoolExists.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    return ApiSuccess(res, "School students fetched successfully", 200, schoolStudents);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const banStudent = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;
    const { banned, banReason, banExpires } = req.body;

    // Run all validation checks concurrently
    const [existingStudent, studentSchoolRelation, studentUser] = await Promise.all([
      db.select().from(student).where(eq(student.id, id)).limit(1),
      req.adminSchoolId
        ? db.select().from(schoolStudent).where(eq(schoolStudent.studentId, id)).limit(1)
        : Promise.resolve([]),
      db.select().from(user).where(eq(user.studentId, id)).limit(1),
    ]);

    if (existingStudent.length === 0) {
      return ApiError(res, "Student not found", 404);
    }

    // If admin (not superAdmin), ensure they can only ban students from their school
    if (req.adminSchoolId) {
      if (studentSchoolRelation.length === 0 || studentSchoolRelation[0].schoolId !== req.adminSchoolId) {
        return ApiError(res, "Forbidden: You can only ban students from your own school", 403);
      }
    }

    if (studentUser.length === 0) {
      return ApiError(res, "User account for student not found", 404);
    }

    await db
      .update(user)
      .set({
        banned: banned === true,
        banReason: banned ? banReason : null,
        banExpires: banned && banExpires ? new Date(banExpires) : null,
      })
      .where(eq(user.studentId, id));

    const action = banned ? "banned" : "unbanned";
    return ApiSuccess(res, `Student ${action} successfully`, 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
