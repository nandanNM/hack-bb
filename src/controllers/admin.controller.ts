import { and, eq, ne } from "drizzle-orm";
import { Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import { createAdminSchema, idParamSchema, updateAdminSchema, validateSchema } from "./validation";
import { account, user } from "../db/auth-schema";
import { controller, school, schoolController } from "../db/schema";
import { sendMail } from "../services/mail.service";
import { passwordGenerator, passwordHasher } from "../services/password.service";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";
import { CSVRowCollection } from "./validation/types";

type Request = AuthenticatedRequest;

export const createAdminCSV = async (req: Request, res: Response) => {
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

    // school id is needed to make sure we add admins for that school
    const { schoolId } = req.body;
    if (!schoolId) {
      return ApiError(res, "School ID is required", 400);
    }

    const schoolExists = await db.select().from(school).where(eq(school.id, schoolId)).limit(1);

    if (schoolExists.length === 0) {
      return ApiError(res, "Invalid school ID", 400);
    }

    // Those arrays are request-scoped, in-memory variables.
    // They exist only for the lifetime of a single HTTP request.
    // no need ofr in memory db or caching here
    const failedAdmins = [];
    const createdAdmins = [];

    // ⚠️ rows are still sequential to avoid DB/mail overload
    for (const admin of data as CSVRowCollection[]) {
      try {
        // Add schoolId from request body to each CSV row for validation
        const adminWithSchoolId = { ...admin, schoolId };
        const rowValidation = validateSchema(createAdminSchema, adminWithSchoolId);
        if (!rowValidation.success) {
          failedAdmins.push({
            email: admin.email || "unknown",
            reason: rowValidation.error,
          });
          continue;
        }

        const { name, email, phoneNumber, controllerRole, image } = rowValidation.data;

        // Prevent creating superAdmin through this endpoint
        if (controllerRole === "superAdmin") {
          failedAdmins.push({
            email,
            reason: "Cannot create superAdmin through this endpoint",
          });
          continue;
        }

        // Force role to be admin or parent only
        const finalRole = controllerRole === "parent" ? "parent" : "admin";

        const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);

        if (existingUser.length > 0) {
          failedAdmins.push({
            email,
            reason: "User with this email already exists in authentication system",
          });
          continue;
        }

        const password = passwordGenerator(email);
        const [hashedPassword, newController] = await Promise.all([
          passwordHasher(password),
          db
            .insert(controller)
            .values({
              phoneNumber: Number(phoneNumber),
              controllerRole: finalRole,
            })
            .returning(),
        ]);

        // newController and newUser have to be sequential as we need controllerId for user
        const newUser = await db
          .insert(user)
          .values({
            name: name,
            email: email,
            emailVerified: false,
            role: finalRole,
            schoolId: schoolId,
            controllerId: newController[0].id,
            isActive: true,
            image: image ?? undefined,
          })
          .returning();

        // these can be concurrent as they dont depend on each other
        await Promise.all([
          db.insert(account).values({
            accountId: newUser[0].id,
            providerId: "credential",
            userId: newUser[0].id,
            password: hashedPassword,
          }),

          db.insert(schoolController).values({
            schoolId: schoolId,
            controllerId: newController[0].id,
          }),
        ]);

        // mail should NOT block request or affect DB success
        sendMail({
          mail: [email],
          subject: "Your Admin Account Password",
          text: `Your password is: ${password}`,
          html: `<p>Your admin account has been created.</p><p>Your password is: <strong>${password}</strong></p>`,
        }).catch(() => {});

        createdAdmins.push({ email, name, controllerRole: finalRole });
      } catch (error) {
        failedAdmins.push({
          email: admin.email,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(
      res,
      `Admin creation process completed. ${createdAdmins.length} created, ${failedAdmins.length} failed`,
      201,
      {
        failed: failedAdmins,
        created: createdAdmins,
        failedCount: failedAdmins.length,
        successCount: createdAdmins.length,
      },
    );
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createAdminSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { name, email, phoneNumber, controllerRole, schoolId, image } = validation.data;
    const schoolExists = await db.select().from(school).where(eq(school.id, schoolId)).limit(1);

    if (schoolExists.length === 0) {
      return ApiError(res, "Invalid school ID", 400);
    }
    const [existingUser, existingController] = await Promise.all([
      db.select().from(user).where(eq(user.email, email)).limit(1),
      db
        .select()
        .from(controller)
        .where(eq(controller.phoneNumber, Number(phoneNumber)))
        .limit(1),
    ]);
    if (existingUser.length > 0) {
      return ApiError(res, "User with this email already exists in authentication system", 400);
    }
    if (existingController.length > 0) {
      return ApiError(res, "User with this phone number already exists", 400);
    }

    const adminRole = controllerRole === "parent" ? "parent" : "admin";

    const password = passwordGenerator(email);
    const [hashedPassword, newController] = await Promise.all([
      passwordHasher(password),
      db
        .insert(controller)
        .values({
          phoneNumber: Number(phoneNumber),
          controllerRole: adminRole,
        })
        .returning(),
    ]);

    const newUser = await db
      .insert(user)
      .values({
        name,
        email,
        emailVerified: false,
        role: adminRole,
        schoolId: schoolId,
        controllerId: newController[0].id,
        isActive: true,
        ...(image && typeof image === "string" ? { image } : {}),
      })
      .returning();

    await Promise.all([
      db.insert(account).values({
        accountId: newUser[0].id,
        providerId: "credential",
        userId: newUser[0].id,
        password: hashedPassword,
      }),
      db.insert(schoolController).values({
        schoolId: schoolId,
        controllerId: newController[0].id,
      }),
    ]);

    sendMail({
      mail: [email],
      subject: "Your Admin Account Password",
      text: `Your password is: ${password}`,
      html: `<p>Your admin account has been created.</p><p>Your password is: <strong>${password}</strong></p>`,
    }).catch(() => {});

    return ApiSuccess(res, "Admin created successfully", 201);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateAdminBySuperAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    const targetControllerId = req.params.id;

    if (!targetControllerId) {
      return ApiError(res, "Admin ID is required", 400);
    }

    const existingController = await db.select().from(controller).where(eq(controller.id, targetControllerId)).limit(1);

    if (existingController.length === 0) {
      return ApiError(res, "Admin not found", 404);
    }

    const currentControllerData = existingController[0];

    const bodyValidation = validateSchema(updateAdminSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { name, phoneNumber, image } = bodyValidation.data;

    const controllerUpdateData: Record<string, number> = {};

    if (phoneNumber) {
      const newPhone = Number(phoneNumber);
      if (newPhone !== Number(currentControllerData.phoneNumber)) {
        const duplicateCheck = await db
          .select()
          .from(controller)
          .where(and(eq(controller.phoneNumber, newPhone), ne(controller.id, targetControllerId)))
          .limit(1);

        if (duplicateCheck.length > 0) {
          return ApiError(res, "Phone number already in use by another admin", 409);
        }
        controllerUpdateData.phoneNumber = newPhone;
      }
    }

    if (Object.keys(controllerUpdateData).length > 0) {
      await db.update(controller).set(controllerUpdateData).where(eq(controller.id, targetControllerId));
    }

    const userUpdateData: Record<string, string> = {};
    if (name) userUpdateData.name = name;
    if (image) userUpdateData.image = image;
    if (phoneNumber) userUpdateData.phoneNumber = String(phoneNumber);

    if (Object.keys(userUpdateData).length > 0) {
      await db.update(user).set(userUpdateData).where(eq(user.controllerId, targetControllerId));
    }

    const updatedAdmin = await db
      .select({
        name: user.name,
        id: controller.id,
        email: user.email,
        image: user.image,
        role: controller.controllerRole,
        createdAt: controller.createdAt,
        schoolId: schoolController.schoolId,
        phoneNumber: controller.phoneNumber,
      })
      .from(controller)
      .innerJoin(user, eq(user.controllerId, controller.id))
      .leftJoin(schoolController, eq(controller.id, schoolController.controllerId))
      .where(eq(controller.id, targetControllerId))
      .limit(1);

    if (updatedAdmin.length === 0) {
      return ApiError(res, "Update successful, but failed to fetch returned data", 500);
    }

    return ApiSuccess(res, "Admin updated successfully", 200, updatedAdmin[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
export const updateAdmin = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    const userRecord = await db.select().from(user).where(eq(user.id, req.user.id)).limit(1);

    if (userRecord.length === 0 || !userRecord[0].controllerId) {
      return ApiError(res, "Unauthorized: Not a controller user", 403);
    }

    const controllerId = userRecord[0].controllerId;

    const bodyValidation = validateSchema(updateAdminSchema, req.body);
    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { name, phoneNumber, image } = bodyValidation.data;
    const existingController = await db.select().from(controller).where(eq(controller.id, controllerId)).limit(1);

    if (existingController.length === 0) {
      return ApiError(res, "Admin not found", 404);
    }

    if (existingController[0].controllerRole === "superAdmin") {
      return ApiError(res, "Cannot update superAdmin through this endpoint", 403);
    }

    const controllerUpdateData: Record<string, number> = {};
    if (phoneNumber) controllerUpdateData.phoneNumber = Number(phoneNumber);

    if (Object.keys(controllerUpdateData).length === 0 && !name && !image) {
      return ApiError(res, "No fields to update", 400);
    }

    if (Object.keys(controllerUpdateData).length > 0) {
      await db.update(controller).set(controllerUpdateData).where(eq(controller.id, controllerId));
    }

    const userUpdateData: Record<string, string> = {};
    if (name) userUpdateData.name = name;
    if (image) userUpdateData.image = image;
    if (phoneNumber) userUpdateData.phoneNumber = String(phoneNumber);

    if (Object.keys(userUpdateData).length > 0) {
      await db.update(user).set(userUpdateData).where(eq(user.controllerId, controllerId));
    }

    // inner join because controller must have a user and a school linked to them
    const updatedAdmin = await db
      .select({
        name: user.name,
        id: controller.id,
        email: user.email,
        image: user.image,
        role: controller.controllerRole,
        createdAt: controller.createdAt,
        schoolId: schoolController.schoolId,
        phoneNumber: controller.phoneNumber,
      })
      .from(controller)
      .innerJoin(user, eq(user.controllerId, controller.id))
      .innerJoin(schoolController, eq(controller.id, schoolController.controllerId))
      .where(eq(controller.id, controllerId))
      .limit(1);

    return ApiSuccess(res, "Admin updated successfully", 200, updatedAdmin[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteAdminById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const existingController = await db.select().from(controller).where(eq(controller.id, id)).limit(1);
    if (existingController.length === 0) {
      return ApiError(res, "Admin not found", 404);
    }

    if (existingController[0].controllerRole === "superAdmin") {
      return ApiError(res, "Cannot delete superAdmin", 403);
    }

    // Delete the controller - this will cascade to:
    // - user table (onDelete: cascade on controllerId)
    // - account table (onDelete: cascade on userId)
    // - schoolController (onDelete: cascade)
    await db.delete(controller).where(eq(controller.id, id));

    return ApiSuccess(res, "Admin deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAdminById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    const adminWithSchool = await db
      .select({
        id: controller.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: controller.phoneNumber,
        role: controller.controllerRole,
        createdAt: controller.createdAt,
        schoolId: schoolController.schoolId,
      })
      .from(controller)
      .innerJoin(user, eq(user.controllerId, controller.id))
      .innerJoin(schoolController, eq(controller.id, schoolController.controllerId))
      .where(eq(controller.id, id))
      .limit(1);

    if (adminWithSchool.length === 0) {
      return ApiError(res, "Admin not found", 404);
    }

    return ApiSuccess(res, "Admin fetched successfully", 200, adminWithSchool[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const adminsWithSchools = await db
      .select({
        id: controller.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: controller.phoneNumber,
        role: controller.controllerRole,
        createdAt: controller.createdAt,
        schoolId: schoolController.schoolId,
      })
      .from(controller)
      .innerJoin(user, eq(user.controllerId, controller.id))
      .innerJoin(schoolController, eq(controller.id, schoolController.controllerId))
      .where(eq(controller.controllerRole, "admin"));

    return ApiSuccess(res, "Admins fetched successfully", 200, adminsWithSchools);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAdminsBySchool = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, { id: req.params.schoolId });
    if (!validation.success) {
      return ApiError(res, "School ID is required", 400);
    }

    const schoolId = validation.data.id;

    const schoolExists = await db.select().from(school).where(eq(school.id, schoolId)).limit(1);
    if (schoolExists.length === 0) {
      return ApiError(res, "School not found", 404);
    }

    const schoolControllers = await db
      .select({
        id: controller.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: controller.phoneNumber,
        role: controller.controllerRole,
        createdAt: controller.createdAt,
        schoolId: schoolController.schoolId,
      })
      .from(schoolController)
      .innerJoin(controller, eq(schoolController.controllerId, controller.id))
      .innerJoin(user, eq(user.controllerId, controller.id))
      .where(eq(schoolController.schoolId, schoolId));

    return ApiSuccess(res, "School admins fetched successfully", 200, schoolControllers);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
