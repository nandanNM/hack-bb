import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, createAuthMiddleware, openAPI } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { ac, schoolAdmin, student, superAdmin } from "./permissions.util";
import { school } from "../db/schema";

// Helper function to resolve school from domain
async function resolveSchoolFromRequest(request: Request | undefined): Promise<{ id: string } | null> {
  try {
    if (!request) return null;

    let domain: string | null = null;

    const nodeEnvironment = process.env.NODE_ENV as string;
    if (nodeEnvironment === "development") {
      domain = (request.headers.get("x-school-domain") as string) || "system";
    } else {
      const origin = request.headers.get("origin");

      if (!origin) return null;

      const url = new URL(origin);
      const hostParts = url.hostname.split(".");
      const subdomain = "demo";

      domain = subdomain || (request.headers.get("x-school-domain") as string) || null;
      if (!domain) return null;
    }

    if (domain === "system") {
      return null;
    }

    const schoolRows = await db.select().from(school).where(eq(school.domain, domain)).execute();
    return schoolRows.length > 0 ? { id: schoolRows[0].id } : null;
  } catch {
    return null;
  }
}

const auth = betterAuth({
  baseURL: process.env.BACKEND_URL || "http://localhost:5000",

  database: drizzleAdapter(db, {
    provider: "pg",
    debugLogs: true,
    camelCase: true,
  }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  advanced: {
    cookiePrefix: "hach2026",
    useSecureCookies: true, // Required for SameSite=None
    crossSubDomainCookies: {
      enabled: true,
    },
  },

  user: {
    additionalFields: {
      schoolId: {
        type: "string",
        required: false,
        // Currently, better-auth does not support foreign key constraints in drizzle adapter
        // If supported in future, add back the foreign key constraint
        // else them manually in the generated auth schema
        // references: { model: "school", field: "id", onDelete: "cascade" }
      },
      studentId: {
        type: "string",
        required: false,
        // Currently, better-auth does not support foreign key constraints in drizzle adapter
        // If supported in future, add back the foreign key constraint
        // else them manually in the generated auth schema
        // references: { model: "student", field: "id", onDelete: "cascade" }
      },
      controllerId: {
        type: "string",
        required: false,
        // Currently, better-auth does not support foreign key constraints in drizzle adapter
        // If supported in future, add back the foreign key constraint
        // else them manually in the generated auth schema
        // references: { model: "controller", field: "id", onDelete: "cascade" }
      },
      isActive: { type: "boolean" },
      disabledAt: { type: "date" },
    },
  },

  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const school = await resolveSchoolFromRequest(ctx.request);
        const user = ctx.context.newSession?.user;
        const userSchoolId = user?.schoolId;
        const userRole = user?.role;

        // In development mode, skip school domain validation
        if (process.env.NODE_ENV === "development") {
          return;
        }

        // Allow superAdmins to sign in regardless of school domain
        if (userRole === "superAdmin") {
          return;
        }

        // If user has a schoolId, they must sign in through their school's domain
        // Unless there's no school context (system domain), then reject non-superAdmin users with schoolId
        if (userSchoolId) {
          if (!school) {
            throw new APIError("FORBIDDEN", { message: "Please sign in through your school's domain" });
          }
          if (userSchoolId !== school.id) {
            throw new APIError("FORBIDDEN", { message: "Invalid school for user" });
          }
        }
      } else if (ctx.path === "/sign-up/email") {
        const school = await resolveSchoolFromRequest(ctx.request);
        const newUserSchoolId = ctx.context.newUser?.schoolId;

        // In development mode, skip school domain validation
        if (process.env.NODE_ENV === "development") {
          return;
        }

        if (newUserSchoolId && newUserSchoolId !== school?.id) {
          throw new APIError("FORBIDDEN", { message: "Invalid school for user" });
        }
      }
    }),
  },

  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "https://hack-bb.vercel.app",
    "https://hach-2026-f.vercel.app",
    "https://*.vercel.app",
    "https://*.hach-2026-f.vercel.app",
  ],

  plugins: [
    openAPI(),
    admin({
      ac,
      defaultRole: "student",
      adminRoles: ["superAdmin"],
      roles: {
        student,
        schoolAdmin,
        superAdmin,
      },
    }),
  ],
});

export default auth;
