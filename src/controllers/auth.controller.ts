// Testing Phase Complete
import { and, eq, gt, isNull } from "drizzle-orm";
import { Request, Response } from "express";

import { db } from "../db";
import { forgotPasswordSchema, resetPasswordSchema, validateSchema } from "./validation";
import { account, session, user } from "../db/auth-schema";
import { passwordResets } from "../db/schema";
import { sendMail } from "../services/mail.service";
import { passwordHasher } from "../services/password.service";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";
import { constantTimeCompare, generateResetToken, hashToken } from "../utils/token.util";

const RATE_LIMIT_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 24;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(forgotPasswordSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { email, userType } = validation.data;

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";

    const normalizedUserType = userType === "student" ? "student" : "controller";

    const users = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (!users || users.length === 0) {
      return ApiSuccess(res, "If the email exists, a password reset link has been sent", 200);
    }

    const foundUser = users[0];

    // Verify user type matches
    if (normalizedUserType === "student" && !foundUser.studentId) {
      return ApiSuccess(res, "If the email exists, a password reset link has been sent", 200);
    }
    if (normalizedUserType === "controller" && !foundUser.controllerId) {
      return ApiSuccess(res, "If the email exists, a password reset link has been sent", 200);
    }
    const now = new Date();
    const rateLimitCutoff = new Date(now.getTime() - RATE_LIMIT_HOURS * 60 * 60 * 1000);

    const existingResets = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.userId, foundUser.id),
          eq(passwordResets.userType, normalizedUserType),
          gt(passwordResets.issuedAt, rateLimitCutoff),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, now),
        ),
      )
      .limit(1);

    if (existingResets.length > 0) {
      return ApiSuccess(res, "If the email exists, a password reset link has been sent", 200);
    }

    const resetToken = generateResetToken(32);
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(now.getTime() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(passwordResets).values({
      userId: foundUser.id,
      userType: normalizedUserType,
      tokenHash,
      issuedAt: now,
      expiresAt,
      ipAddress,
    });

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}&type=${normalizedUserType}`;

    await sendMail({
      mail: [email],
      subject: "Password Reset Request",
      text: `You requested to reset your password. Use this link: ${resetLink}. This link will expire in ${RESET_TOKEN_EXPIRY_HOURS} hours.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in ${RESET_TOKEN_EXPIRY_HOURS} hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return ApiSuccess(res, "If the email exists, a password reset link has been sent", 200);
  } catch {
    return ApiError(res, "An error occurred while processing your request", 500);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(resetPasswordSchema, req.body);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { token, userType, newPassword } = validation.data;

    const tokenHash = hashToken(token);
    const now = new Date();

    const resetRecords = await db
      .select()
      .from(passwordResets)
      .where(
        and(eq(passwordResets.userType, userType), gt(passwordResets.expiresAt, now), isNull(passwordResets.usedAt)),
      );

    let validReset = null;
    for (const record of resetRecords) {
      if (constantTimeCompare(record.tokenHash, tokenHash)) {
        validReset = record;
        break;
      }
    }

    if (!validReset) {
      return ApiError(res, "Invalid or expired reset token", 400);
    }

    const hashedPassword = await passwordHasher(newPassword);
    const users = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, validReset.userId)));

    await db.update(account).set({ password: hashedPassword }).where(eq(account.userId, users[0].id));
    await db.delete(session).where(eq(session.userId, users[0].id));
    await db.update(passwordResets).set({ usedAt: now }).where(eq(passwordResets.id, validReset.id));

    return ApiSuccess(res, "Password reset successfully. Please login with your new password.", 200);
  } catch {
    return ApiError(res, "An error occurred while resetting password", 500);
  }
};
