import { z } from "zod";

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

export const validateSchema = <T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((err: z.ZodIssue) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessages };
  }
  return { success: true, data: result.data };
};

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export const studentIdParamSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
});

export const paginationSchema = z.object({
  limit: z.coerce
    .number({ error: "Limit must be a valid number" })
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(10),
  page: z.coerce
    .number({ error: "Page must be a valid number" })
    .min(1, "Page must be at least 1")
    .optional()
    .default(1),
});

export const createAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  controllerRole: z
    .enum(["admin", "parent", "superAdmin"], {
      error: "Role must be either 'admin' or 'parent'",
    })
    .optional()
    .default("admin"),
  schoolId: z.string().uuid("Invalid School ID format"),
  image: z.string().url("Invalid image URL format").optional(),
});

export const updateAdminSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .optional(),
  image: z.string().url("Invalid image URL format").optional(),
});

export const passwordChangeSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
});

export const updateControllerProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  email: z.email("Invalid email format").optional(),
  image: z.string().url("Invalid image URL format").optional(),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .optional(),
});

export const createStudentCSVSchema = z.object({
  schoolId: z.string().uuid("Invalid School ID format").optional(),
});

// Schema for validating each row in the student CSV
export const studentCSVRowSchema = z.object({
  name: z
    .string({ error: "Name must be a string" })
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  email: z.string({ error: "Email must be a string" }).email("Invalid email format"),
  class: z
    .string({ error: "Class must be a string" })
    .min(1, "Class is required")
    .max(50, "Class cannot exceed 50 characters"),
  picture: z.string().url("Invalid picture URL").optional(),
  level: z.string().regex(/^\d*$/, "Level must be a number").optional().default("0"),
});

export const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["school", "individual"], {
    error: "Role must be either 'school' or 'individual'",
  }),
  class: z.string().min(1, "Class is required").max(50, "Class cannot exceed 50 characters"),
  picture: z.string().url("Invalid picture URL").optional(),
  schoolId: z.string().uuid("Invalid School ID format").optional(),
  level: z.coerce
    .number({ error: "Level must be a valid number" })
    .int("Level must be an integer")
    .min(0, "Level cannot be negative")
    .default(0),
});

export const updateStudentSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").optional(),
  class: z.string().min(1, "Class cannot be empty").max(50, "Class cannot exceed 50 characters").optional(),
  level: z.coerce
    .number({ error: "Level must be a valid number" })
    .int("Level must be an integer")
    .min(0, "Level cannot be negative")
    .optional(),
  imageUrl: z.string().url("Invalid image URL format").optional(),
});

export const createSchoolSchema = z.object({
  schoolName: z.string().min(1, "School name is required"),
  schoolAddress: z.string().min(1, "School address is required"),
  schoolCity: z.string().min(1, "School city is required"),
  schoolState: z.string().min(1, "School state is required"),
  schoolZip: z.string().regex(/^\d{6}$/, "School zip must be exactly 6 digits"),
  schoolCountry: z.string().min(1, "School country is required"),
  schoolEmail: z.string().email("Invalid email format"),
  schoolLogoUrl: z.string().url("Invalid logo URL").optional().nullable(),
  themePrimary: z.string().optional(),
  themeSecondary: z.string().optional(),
});

export const schoolCSVRowSchema = z.object({
  schoolName: z
    .string({ error: "School name must be a string" })
    .min(1, "School name is required")
    .max(200, "School name cannot exceed 200 characters"),
  schoolAddress: z.string({ error: "School address must be a string" }).min(1, "School address is required"),
  schoolCity: z.string({ error: "School city must be a string" }).min(1, "School city is required"),
  schoolState: z.string({ error: "School state must be a string" }).min(1, "School state is required"),
  schoolZip: z.string().regex(/^\d{6}$/, "School zip must be exactly 6 digits"),
  schoolCountry: z.string({ error: "School country must be a string" }).min(1, "School country is required"),
  schoolEmail: z.string().email("Invalid school email format").optional(),
  schoolLogoUrl: z.string().url("Invalid logo URL").optional(),
  themePrimary: z.string().optional(),
  themeSecondary: z.string().optional(),
});

export const updateSchoolSchema = z.object({
  schoolName: z.string().min(1).optional(),
  schoolAddress: z.string().min(1).optional(),
  schoolCity: z.string().min(1).optional(),
  schoolState: z.string().min(1).optional(),
  schoolZip: z
    .string()
    .regex(/^\d{6}$/, "School zip must be exactly 6 digits")
    .optional(),
  schoolCountry: z.string().min(1).optional(),
  schoolEmail: z.string().email("Invalid email format").optional(),
  schoolLogoUrl: z.string().url().optional().nullable(),
  themePrimary: z.string().optional(),
  themeSecondary: z.string().optional(),
});

export const createCourseSchema = z.object({
  courseName: z.string().min(1, "Course name is required"),
  courseDetail: z.string().min(1, "Course detail is required"),
  courseImage: z.string().url("Invalid course image URL format"),
  link: z.array(z.string().url("Each link must be a valid URL")).min(1, "At least one link is required"),
});

export const courseCSVRowSchema = z.object({
  courseName: z
    .string({ error: "Course name must be a string" })
    .min(1, "Course name is required")
    .max(200, "Course name cannot exceed 200 characters"),
  courseDetail: z.string({ error: "Course detail must be a string" }).min(1, "Course detail is required"),
  courseImage: z.string().url("Invalid course image URL format"),
  link: z.string({ error: "Link must be a valid JSON array string" }).min(1, "Link is required"),
});

export const updateCourseSchema = z.object({
  courseName: z.string().min(1).optional(),
  courseDetail: z.string().min(1).optional(),
  courseImage: z.string().url("Invalid course image URL format").optional(),
  link: z.array(z.string().url("Each link must be a valid URL")).min(1, "At least one link is required").optional(),
});

export const createInstructorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  detail: z.string().min(1, "Detail is required"),
});

export const instructorCSVRowSchema = z.object({
  name: z
    .string({ error: "Name must be a string" })
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters"),
  detail: z
    .string({ error: "Detail must be a string" })
    .min(1, "Detail is required")
    .max(2000, "Detail cannot exceed 2000 characters"),
});

export const updateInstructorSchema = z.object({
  name: z.string().min(1).optional(),
  detail: z.string().min(1).optional(),
});

export const createLectureSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  url: z.string().url("Invalid URL format"),
});

export const lectureCSVRowSchema = z.object({
  title: z
    .string({ error: "Title must be a string" })
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string({ error: "Description must be a string" })
    .min(1, "Description is required")
    .max(2000, "Description cannot exceed 2000 characters"),
  url: z.string().url("Invalid URL format"),
});

export const updateLectureSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  url: z.string().url("Invalid URL format").optional(),
});
export const assignLectureSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID format"),
  lectureId: z.string().uuid("Invalid Lecture ID format"),
});

export const bulkAssignLecturesSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID format"),
  lectureIds: z.array(z.string().uuid("Invalid Lecture ID format")).min(1, "At least one lecture ID is required"),
});

export const qnaTypeSchema = z.enum(["mcq", "coding", "paragraph", "blockly"], {
  error: "QNA type must be one of: 'mcq', 'coding', or 'paragraph'",
});

export const createQuestionSchema = z
  .object({
    qnaType: qnaTypeSchema,
    question: z.string().min(1, "Question is required"),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
    testCases: z.any().optional(),
    keywords: z.array(z.string()).optional(),
    answer: z.string().min(1, "Answer is required"),
    hints: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.qnaType === "mcq") {
        return data.options && Array.isArray(data.options) && data.options.length > 0;
      }
      return true;
    },
    { message: "Options array is required for MCQ", path: ["options"] },
  )
  .refine(
    (data) => {
      if (data.qnaType === "coding" || data.qnaType === "blockly") {
        return data.testCases !== undefined;
      }
      return true;
    },
    { message: "Test cases are required for coding questions", path: ["testCases"] },
  )
  .refine(
    (data) => {
      if (data.qnaType === "paragraph") {
        return data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0;
      }
      return true;
    },
    { message: "Keywords array is required for paragraph questions", path: ["keywords"] },
  )
  .refine(
    (data) => {
      if (data.qnaType === "mcq" && data.options && Array.isArray(data.options)) {
        return data.options.includes(data.answer);
      }
      return true;
    },
    { message: "Answer must be one of the provided options for MCQ", path: ["answer"] },
  );

export const questionCSVRowSchema = z
  .object({
    qnaType: qnaTypeSchema,
    question: z.string().min(1, "Question is required"),
    options: z.string().optional(),
    testCases: z.string().optional(),
    keywords: z.string().optional(),
    description: z.string().optional(),
    hints: z.string().optional(),
    answer: z.string().min(1, "Answer is required"),
  })

  .refine(
    (data) => {
      if (data.qnaType === "mcq") {
        return !!data.options && data.options.trim().length > 0;
      }
      return true;
    },
    { message: "Options are required for MCQ", path: ["options"] },
  )
  .refine(
    (data) => {
      if (data.qnaType === "mcq" && data.options) {
        const opts = data.options.split("|").map((o) => o.trim());
        return opts.includes(data.answer.trim());
      }
      return true;
    },
    { message: "Answer must be one of the provided options", path: ["answer"] },
  )

  .refine(
    (data) => {
      if (data.qnaType === "coding") {
        return !!data.testCases && data.testCases.trim().length > 0;
      }
      return true;
    },
    { message: "testCases are required for coding questions", path: ["testCases"] },
  )
  .refine(
    (data) => {
      if (data.qnaType === "paragraph") {
        return !!data.keywords && data.keywords.trim().length > 0;
      }
      return true;
    },
    { message: "keywords are required for paragraph questions", path: ["keywords"] },
  );

export const updateQuestionSchema = z
  .object({
    qnaType: qnaTypeSchema.optional(),
    question: z.string().min(1).optional(),
    options: z.array(z.string()).optional(),
    testCases: z.any().optional(),
    keywords: z.array(z.string()).optional(),
    description: z.string().optional(),
    answer: z.string().min(1).optional(),
    hints: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.qnaType === "mcq" && data.answer !== undefined && data.options) {
        return data.options.includes(data.answer);
      }
      return true;
    },
    { message: "Answer must be one of the provided options for MCQ", path: ["answer"] },
  );

export const difficultyLevelSchema = z.enum(["easy", "medium", "hard"], {
  error: "Difficulty level must be one of: 'easy', 'medium', or 'hard'",
});

export const createAssignmentSchema = z.object({
  lectureId: z.string().uuid("Invalid Lecture ID format"),
  qnaId: z.string().uuid("Invalid QNA ID format"),
  difficultyLevel: difficultyLevelSchema,
  qnaType: qnaTypeSchema,
  assignmentLevel: z.coerce
    .number({ error: "Assignment level must be a valid number" })
    .min(0, "Assignment level must be 0 or greater"),
});

export const createBulkAssignmentsSchema = z.object({
  lectureId: z.string().uuid("Invalid Lecture ID format"),
  assignments: z
    .array(
      z.object({
        qnaId: z.string().uuid("Invalid QNA ID format"),
        difficultyLevel: difficultyLevelSchema,
        qnaType: qnaTypeSchema,
        assignmentLevel: z.coerce.number().min(0),
      }),
    )
    .min(1, "At least one assignment is required"),
});

export const updateAssignmentSchema = z.object({
  difficultyLevel: difficultyLevelSchema.optional(),
  assignmentLevel: z.coerce
    .number({ error: "Assignment level must be a valid number" })
    .int("Assignment level must be an integer")
    .min(0, "Assignment level cannot be negative")
    .optional(),
});

export const createCommentSchema = z.object({
  assignmentId: z.string().uuid("Invalid Assignment ID format"),
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(2000, "Comment content cannot exceed 2000 characters"),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment content cannot be empty")
    .max(2000, "Comment content cannot exceed 2000 characters"),
});

export const updatePackagesSchema = z.object({
  curioCode: z.boolean().optional(),
  curioAi: z.boolean().optional(),
  curioBot: z.boolean().optional(),
  curioThink: z.boolean().optional(),
});

export const togglePackageSchema = z.object({
  packageName: z.enum(["curioCode", "curioAi", "curioBot", "curioThink"]),
  enabled: z.boolean(),
});

export const assignInstructorSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID format"),
  instructorId: z.string().uuid("Invalid Instructor ID format"),
});

export const bulkAssignInstructorsSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID format"),
  instructorIds: z
    .array(z.string().uuid("Invalid Instructor ID format"))
    .min(1, "At least one instructor ID is required"),
});

export const updateWatchProgressSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
  lectureId: z.string().uuid("Invalid Lecture ID format"),
  watchedTime: z.coerce
    .number({ error: "Watched time must be a valid number" })
    .min(0, "Watched time cannot be negative"),
});

export const watchProgressParamsSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
  lectureId: z.string().uuid("Invalid Lecture ID format"),
});

export const qnaCompletionParamsSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
  qnaId: z.string().uuid("Invalid QNA ID format"),
});

export const studentLectureParamsSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
  lectureId: z.string().uuid("Invalid Lecture ID format"),
});

export const qnaCompletionStatusSchema = z.enum(["pending", "completed", "inProgress"], {
  error: "Status must be one of: 'pending', 'completed', or 'inProgress'",
});

export const markQnaCompletedSchema = z.object({
  qnaId: z.string().uuid("Invalid QNA ID format"),
  status: qnaCompletionStatusSchema.optional().default("completed"),
});
export const markQnaInProgressSchema = z.object({
  qnaId: z.string().uuid("Invalid QNA ID format"),
});

export const assignmentCompletionParamsSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
  assignmentId: z.string().uuid("Invalid Assignment ID format"),
});

export const assignmentProgressParamsSchema = z.object({
  assignmentId: z.string().uuid("Invalid Assignment ID format"),
  studentId: z.string().uuid("Invalid Student ID format"),
});

export const markAssignmentCompletedSchema = z.object({
  studentId: z.string().uuid("Invalid Student ID format"),
  assignmentId: z.string().uuid("Invalid Assignment ID format"),
  status: z.enum(["pending", "completed", "inProgress"]).optional().default("completed"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
  userType: z.enum(["student", "admin", "parent", "superAdmin", "teacher"], {
    error: "User type must be one of: 'student', 'admin', 'parent', or 'superAdmin' or 'teacher' ",
  }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  userType: z.enum(["student", "controller"], {
    error: "User type must be either 'student' or 'controller'",
  }),
  newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});

export const createSuperAdminSchema = z
  .object({
    superAdminPass1: z.string().min(1, "Super admin password 1 is required"),
    superAdminPass2: z.string().min(1, "Super admin password 2 is required"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(100, "Password cannot exceed 100 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
    email: z.string().email("Invalid email format"),
    name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
    phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    image: z.string().url("Invalid image URL format").optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const dashboardStatsQuerySchema = z.object({
  schoolId: z.string().optional(),
});

export const topPerformersQuerySchema = z.object({
  limit: z.coerce
    .number({ error: "Limit must be a valid number" })
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(10),
  schoolId: z.string().min(1, "School ID cannot be empty").optional(),
});

export const attentionStudentsQuerySchema = z.object({
  schoolId: z.string().min(1, "School ID cannot be empty").optional(),
  threshold: z.coerce
    .number({ error: "Threshold must be a valid number" })
    .min(0, "Threshold must be between 0 and 100")
    .max(100, "Threshold must be between 0 and 100")
    .optional()
    .default(30),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateLectureInput = z.infer<typeof createLectureSchema>;
export type UpdateLectureInput = z.infer<typeof updateLectureSchema>;
export type AssignLectureInput = z.infer<typeof assignLectureSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type TogglePackageInput = z.infer<typeof togglePackageSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdatePackagesInput = z.infer<typeof updatePackagesSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CreateInstructorInput = z.infer<typeof createInstructorSchema>;
export type UpdateInstructorInput = z.infer<typeof updateInstructorSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type AssignInstructorInput = z.infer<typeof assignInstructorSchema>;
export type MarkQnaCompletedInput = z.infer<typeof markQnaCompletedSchema>;
export type CreateSuperAdminInput = z.infer<typeof createSuperAdminSchema>;
export type UpdateWatchProgressInput = z.infer<typeof updateWatchProgressSchema>;
