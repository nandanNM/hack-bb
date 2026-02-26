// Testing Phase Complete
import { eq } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import {
  createSuperAdminSchema,
  passwordChangeSchema,
  updateControllerProfileSchema,
  validateSchema,
} from "./validation";
import { account, user } from "../db/auth-schema";
import { controller } from "../db/schema";
import { passwordCompare, passwordHasher } from "../services/password.service";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

const AdminPass1 = process.env.SUPER_ADMIN_PASSWORD_1!;
const AdminPass2 = process.env.SUPER_ADMIN_PASSWORD_2!;

export const createSuperAdmin = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createSuperAdminSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { superAdminPass1, superAdminPass2, password, email, name, phoneNumber, image } = validation.data;
    if (superAdminPass1 !== AdminPass1 || superAdminPass2 !== AdminPass2) {
      return ApiError(res, "Unauthorized to create super admin", 401);
    }

    const existingUser = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (existingUser.length > 0) {
      return ApiError(res, "User with this email already exists in authentication system", 400);
    }

    const [hashedPassword, newSuperAdmin] = await Promise.all([
      passwordHasher(password),
      db
        .insert(controller)
        .values({
          phoneNumber: Number(phoneNumber),
          controllerRole: "superAdmin",
        })
        .returning(),
    ]);

    const userValues = {
      name,
      email,
      emailVerified: false,
      role: "superAdmin",
      controllerId: newSuperAdmin[0].id,
      isActive: true,
      ...(image && { image }),
    };

    const newUser = await db.insert(user).values(userValues).returning();
    const accountValues = {
      accountId: newUser[0].id,
      providerId: "credential",
      userId: newUser[0].id,
      password: hashedPassword,
    };

    await db.insert(account).values(accountValues);

    const responseData = { ...newSuperAdmin[0] };
    delete (responseData as { password?: string }).password;

    return ApiSuccess(res, "Super admin created successfully", 201, responseData);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const passwordChange = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.email) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    const validation = validateSchema(passwordChangeSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { oldPassword, newPassword } = validation.data;

    const userRecord = await db.select().from(user).where(eq(user.id, req.user.id)).limit(1);
    if (userRecord.length === 0 || !userRecord[0].controllerId) {
      return ApiError(res, "Controller not found", 404);
    }
    if (req.user.role !== userRecord[0].role) {
      return ApiError(res, "You can't change other's password", 400);
    }

    const existingController = await db
      .select()
      .from(controller)
      .where(eq(controller.id, userRecord[0].controllerId))
      .limit(1);
    if (existingController.length === 0) {
      return ApiError(res, "Controller not found", 404);
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

export const updateControllerProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    const validation = validateSchema(updateControllerProfileSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { name, email, image, phoneNumber } = validation.data;

    const userRecord = await db.select().from(user).where(eq(user.id, req.user.id)).limit(1);
    if (userRecord.length === 0 || !userRecord[0].controllerId) {
      return ApiError(res, "Controller not found", 404);
    }
    const controllerId = userRecord[0].controllerId;

    const userUpdateData: Record<string, string> = {};
    if (name) userUpdateData.name = name;
    if (image) userUpdateData.image = image;
    if (email) userUpdateData.email = email;

    if (Object.keys(userUpdateData).length > 0) {
      await db.update(user).set(userUpdateData).where(eq(user.id, req.user.id));
    }

    if (phoneNumber) {
      await db
        .update(controller)
        .set({ phoneNumber: Number(phoneNumber) })
        .where(eq(controller.id, controllerId));
    }

    if (Object.keys(userUpdateData).length === 0 && !phoneNumber) {
      return ApiError(res, "No fields to update", 400);
    }

    const updatedProfile = await db
      .select({
        id: controller.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: controller.phoneNumber,
        role: controller.controllerRole,
      })
      .from(controller)
      .innerJoin(user, eq(user.controllerId, controller.id))
      .where(eq(controller.id, controllerId))
      .limit(1);

    return ApiSuccess(res, "Profile updated successfully", 200, updatedProfile[0]);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
