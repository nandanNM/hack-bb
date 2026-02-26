import { Session, User } from "better-auth";
import { InferSelectModel } from "drizzle-orm";
import { Request } from "express";

import { school } from "../db/schema";

export type School = InferSelectModel<typeof school>;

export interface AuthenticatedRequest extends Request {
  session?: Session;
  user?: User & {
    schoolId?: string | null;
    studentId?: string | null;
    controllerId?: string | null;
    role?: string | null;
  };
}

export interface TenantRequest extends Request {
  school?: School;
  adminSchoolId?: string; // Set by requireAdminSchoolAccess middleware for admins
}

export interface AuthenticatedTenantRequest extends AuthenticatedRequest, TenantRequest {}

/*
declare const sessionSchema: z.ZodObject<{
  id: z.ZodString;
  createdAt: z.ZodDefault<z.ZodDate>;
  updatedAt: z.ZodDefault<z.ZodDate>;
  userId: z.ZodCoercedString<unknown>;
  expiresAt: z.ZodDate;
  token: z.ZodString;
  ipAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
  userAgent: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
*/
