import "@dotenvx/dotenvx/config";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { Request, Response } from "express";
import morgan from "morgan";

import { pool } from "./db";
import { tenantResolver } from "./middleware/tenant.middleware";
import adminRouter from "./routes/admin.route";
import analyticsRouter from "./routes/analytics.route";
import assignmentRouter from "./routes/assignment.route";
import assignmentCompletedRouter from "./routes/assignmentCompleted.route";
import authRouter from "./routes/auth.route";
import commentRouter from "./routes/comment.route";
import courseRouter from "./routes/course.route";
import courseInstructorRouter from "./routes/courseInstructor.route";
import courseLectureRouter from "./routes/courseLecture.route";
import domainRouter from "./routes/domain.route";
import instructorRouter from "./routes/instructor.route";
import lectureRouter from "./routes/lecture.route";
import lectureWatchedRouter from "./routes/lectureWatched.route";
import packagesRouter from "./routes/packages.route";
import qnaCompletedRouter from "./routes/qnaCompleted.route";
import questionRouter from "./routes/question.route";
import schoolRouter from "./routes/school.route";
import studentRouter from "./routes/student.route";
import superAdminRouter from "./routes/superAdmin.route";
import { ApiError, ApiSuccess } from "./utils/apiResponse.utils";
import auth from "./utils/auth.util";

const app = express();
const PORT = process.env.PORT || 5000;
// const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Development Logging
app.use(morgan("dev"));

const allowedOriginRegex = /^https:\/\/([a-zA-Z0-9-]+)\.pghall1\.in$/;

// CORS must be registered BEFORE all route handlers (including better-auth)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === "http://localhost:3000" || allowedOriginRegex.test(origin)) {
        return callback(null, origin); // exact origin returned
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-school-domain"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    optionsSuccessStatus: 200,
  }),
);

// Body parsers MUST come before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------- //
// Routes Go Here

// Better-auth router
app.use("/api/auth", toNodeHandler(auth));
// Add /api/me as an alias for session endpoint (for server-side auth checks)
app.get("/api/me", async (req: Request, res: Response) => {
  try {
    const session = await auth.api.getSession({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headers: req.headers as any,
    });

    if (!session) {
      return ApiError(res, "Not authenticated", 401);
    }

    return ApiSuccess(res, "Session retrieved", 200, session);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return ApiError(res, "Error retrieving session", 401);
  }
});

app.use("/api/superAdmin", superAdminRouter);
app.use("/api/admin", adminRouter);
app.use("/api/password", authRouter);
app.use("/api/student", tenantResolver, studentRouter);
app.use("/api/school", tenantResolver, schoolRouter);
app.use("/api/question", tenantResolver, questionRouter);
app.use("/api/instructor", tenantResolver, instructorRouter);
app.use("/api/lecture", tenantResolver, lectureRouter);
app.use("/api/lecture-watched", tenantResolver, lectureWatchedRouter);
app.use("/api/course", tenantResolver, courseRouter);
app.use("/api/course-instructor", tenantResolver, courseInstructorRouter);
app.use("/api/course-lecture", tenantResolver, courseLectureRouter);
app.use("/api/packages", tenantResolver, packagesRouter);

app.use("/api/assignment", tenantResolver, assignmentRouter);
app.use("/api/qna-completed", tenantResolver, qnaCompletedRouter);
app.use("/api/assignment-completed", tenantResolver, assignmentCompletedRouter);
app.use("/api/comment", tenantResolver, commentRouter);

app.use("/api/analytics", tenantResolver, analyticsRouter);
app.use("/api/domain", domainRouter);

// ----------------------------------------------------------- //
app.get("/", (req: Request, res: Response) => {
  return ApiSuccess(res, "Welcome to the API", 200, { version: "1.0.0" });
});

app.get("/test", (req: Request, res: Response) => {
  return ApiSuccess(res, "API is working fine", 200, { time: new Date().toISOString() });
});

// 404 Handler - Route not found
app.use((req: Request, res: Response) => {
  ApiError(res, "Route not found", 404, { path: req.originalUrl });
});

const server = app
  .listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on port https://localhost:${PORT}`);
  })
  .on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Server failed to start:", err);
  });

// Graceful shutdown - close pool connections
process.on("SIGTERM", async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

export default app;
