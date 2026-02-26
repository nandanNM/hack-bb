import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, Response } from "express";

import { AuthenticatedRequest, TenantRequest } from "../types/index.types";
import { ApiError } from "../utils/apiResponse.utils";
import auth from "../utils/auth.util";

export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return ApiError(res, "Unauthorized - Please login to continue", 401);
      }

      const userRole = session.user.role!;
      if (!allowedRoles.includes(userRole)) {
        return ApiError(res, "Forbidden", 403);
      }

      // Attach session and user to request
      (req as AuthenticatedRequest).session = session.session;
      (req as AuthenticatedRequest).user = session.user;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireSuperAdmin = requireRole(["superAdmin"]);
export const requireAdminOrSuperAdmin = requireRole(["admin", "superAdmin"]);
export const requireController = requireRole(["superAdmin", "admin", "parent"]);
export const requireAnyAuth = requireRole(["admin", "superAdmin", "parent", "school", "teacher"]);

export const requireOwnSchool = async (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user.schoolId) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    if (!req.school || req.school.id !== session.user.schoolId) {
      return ApiError(res, "Forbidden: You can only manage your own school", 403);
    }

    // Attach session and user to request
    (req as AuthenticatedRequest).session = session.session;
    (req as AuthenticatedRequest).user = session.user;

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdminSchoolAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return ApiError(res, "Unauthorized - Please login to continue", 401);
    }

    // Attach session and user to request
    (req as AuthenticatedRequest).session = session.session;
    (req as AuthenticatedRequest).user = session.user;

    const userRole = session.user.role || "student";

    if (userRole === "superAdmin") {
      return next();
    }

    if (userRole === "admin") {
      if (!session.user.schoolId) {
        return ApiError(res, "Admin must be associated with a school", 403);
      }

      (req as TenantRequest).adminSchoolId = session.user.schoolId;
    }

    next();
  } catch (error) {
    next(error);
  }
};
