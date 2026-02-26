// schema has been human tested and perfect as per requirements
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { v7 } from "uuid";

export const qnaTypeEnum = pgEnum("qnaType", ["mcq", "coding", "paragraph", "blockly"]);
export const roleEnumStudent = pgEnum("studentRole", ["individual", "school"]);
export const statusEnum = pgEnum("status", ["pending", "completed", "inProgress"]);
export const assignmentEnum = pgEnum("difficultyLevel", ["easy", "medium", "hard"]);
export const roleEnumController = pgEnum("controllerRole", ["parent", "admin", "superAdmin", "teacher"]);

export const baseSchema = {
  id: uuid("id").primaryKey().$default(v7),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};

export const controller = pgTable("controller", {
  ...baseSchema,
  phoneNumber: bigint("phoneNumber", { mode: "number" }).notNull().unique(),
  controllerRole: roleEnumController("controllerRole").notNull(),
});

export const schoolController = pgTable("schoolController", {
  ...baseSchema,
  schoolId: uuid("schoolId")
    .notNull()
    .references(() => school.id, { onDelete: "cascade" }),
  controllerId: uuid("controllerId")
    .notNull()
    .references(() => controller.id, { onDelete: "cascade" }),
});

// why are we breaking the school schema into multiple parts?
// this breaks normalisation
// 1.) normalisation is a good database design priciple, it's a good design principle not a mandate.
// 2.) we can check that schoolDomain is unique in schoolDomain table that is faster.
// 3.) the school table has a domain column to basically tell the doamin so we arent calling the domain table again and again
export const school = pgTable(
  "school",
  {
    ...baseSchema,
    schoolAddress: text("schoolAddress"),
    schoolZip: varchar("schoolZip", { length: 10 }),
    schoolCity: varchar("schoolCity", { length: 100 }),
    schoolState: varchar("schoolState", { length: 100 }),
    schoolCountry: varchar("schoolCountry", { length: 100 }),
    schoolLogoUrl: varchar("schoolLogoUrl", { length: 1000 }),
    schoolName: varchar("schoolName", { length: 250 }).notNull(),
    schoolEmail: varchar("schoolEmail", { length: 320 }).notNull(),
    domain: varchar("domain", { length: 200 }).notNull(),
    themePrimary: varchar("themePrimary", { length: 20 }),
    themeSecondary: varchar("themeSecondary", { length: 20 }),
  },
  (table) => [
    // unique domain for tenant linking
    uniqueIndex("uqSchoolsDomain").on(table.domain),
  ],
);

export const schoolDomain = pgTable("schoolDomain", {
  ...baseSchema,
  domain: varchar("domain", { length: 200 }).notNull().unique(),
  schoolId: uuid("schoolId")
    .notNull()
    .references(() => school.id, { onDelete: "cascade" }),
});

export const student = pgTable("student", {
  ...baseSchema,
  level: integer("level").notNull(),
  role: roleEnumStudent("role").notNull(),
  class: varchar("class", { length: 50 }), // student class/grade
});

export const instructor = pgTable("instructor", {
  ...baseSchema,
  name: text("name").notNull(),
  detail: text("detail").notNull(),
});

// School Schema
export const mcq = pgTable("mcq", {
  ...baseSchema,
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" })
    .unique(),
  question: text("question").notNull(),
  description: text("description"),
  options: jsonb("options").notNull(),
});

export const coding = pgTable("coding", {
  ...baseSchema,
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" })
    .unique(),
  question: text("question").notNull(),
  description: text("description"),
  testCases: jsonb("testCases").notNull(),
});
export const blockly = pgTable("blockly", {
  ...baseSchema,
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" })
    .unique(),
  question: text("question").notNull(),
  description: text("description"),
  testCases: jsonb("testCases").notNull(),
});

export const paragraph = pgTable("paragraph", {
  ...baseSchema,
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" })
    .unique(),
  question: text("question").notNull(),
  description: text("description"),
  keywords: jsonb("keywords").notNull(),
});

export const qna = pgTable("qna", {
  ...baseSchema,
  qnaType: qnaTypeEnum("qnaType").notNull(),
});

export const assignment = pgTable("assignment", {
  ...baseSchema,
  lectureId: uuid("lectureId")
    .notNull()
    .references(() => lecture.id, { onDelete: "cascade" }),
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" }),
  difficultyLevel: assignmentEnum("difficultyLevel").notNull(),
  qnaType: qnaTypeEnum("qnaType").notNull(),
  assignmentLevel: integer("assignmentLevel").notNull(),
});

export const qnaAnswer = pgTable("qnaAnswer", {
  ...baseSchema,
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" }),
  answer: text("answer").notNull(),
  hints: jsonb("hints").notNull(), // Array of strings: ["Hint 1", "Hint 2", "Hint 3"]
});
// review this answered and qna table which option is better, should we merge the table since index is on pk
// confrim if drizzle creates index on foreign keys automatically

export const qnaCompleted = pgTable("qnaCompleted", {
  ...baseSchema,
  qnaId: uuid("qnaId")
    .notNull()
    .references(() => qna.id, { onDelete: "cascade" }),
  studentId: uuid("studentId")
    .notNull()
    .references(() => student.id, { onDelete: "cascade" }),
  status: statusEnum("status").notNull(),
});

// Courses

export const course = pgTable("course", {
  ...baseSchema,
  courseName: text("courseName").notNull(),
  courseDetail: text("courseDetail").notNull(),
  courseImage: text("courseImage").notNull(),
  link: jsonb("link").notNull(),
});

// Connected Tables
export const schoolStudent = pgTable(
  "schoolStudent",
  {
    ...baseSchema,
    schoolId: uuid("schoolId")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    studentId: uuid("studentId")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uniqueSchoolStudent: unique("uniqueSchoolStudent").on(table.schoolId, table.studentId),
  }),
);

export const assignmentCompleted = pgTable(
  "assignmentCompleted",
  {
    ...baseSchema,
    assignmentId: uuid("assignmentId")
      .notNull()
      .references(() => assignment.id, { onDelete: "cascade" }),
    studentId: uuid("studentId")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    status: statusEnum("status").notNull(),
  },
  (table) => ({
    uniqueAssignmentStudent: unique("uniqueAssignmentStudent").on(table.assignmentId, table.studentId),
  }),
);

export const courseInstructor = pgTable(
  "courseInstructor",
  {
    ...baseSchema,
    courseId: uuid("courseId")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    instructorId: uuid("instructorId")
      .notNull()
      .references(() => instructor.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uniqueCourseInstructor: unique("uniqueCourseInstructor").on(table.courseId, table.instructorId),
  }),
);

export const packages = pgTable("packages", {
  ...baseSchema,
  schoolId: uuid("schoolId")
    .notNull()
    .references(() => school.id, { onDelete: "cascade" }),
  curioCode: boolean("curioCode").notNull().default(false),
  curioAi: boolean("curioAi").notNull().default(false),
  curioBot: boolean("curioBot").notNull().default(false),
  curioThink: boolean("curioThink").notNull().default(false),
});

export const passwordResets = pgTable("passwordResets", {
  id: uuid("id").primaryKey().$default(v7),
  userId: uuid("userId").notNull(),
  userType: text("userType").notNull(),
  tokenHash: text("tokenHash").notNull().unique(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  ipAddress: varchar("ipAddress", { length: 45 }),
});

// parent id has to be handled in backend for nested comments
export const comment = pgTable("comment", {
  ...baseSchema,
  // parentCommentId: uuid('parentCommentId').references(() => comment.id, { onDelete: 'cascade' }),
  assignmentId: uuid("assignmentId")
    .notNull()
    .references(() => assignment.id, { onDelete: "cascade" }),
  studentId: uuid("studentId")
    .notNull()
    .references(() => student.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
});

// Not needed
export const lectureWatched = pgTable(
  "lectureWatched",
  {
    ...baseSchema,
    studentId: uuid("studentId")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    lectureId: uuid("lectureId")
      .notNull()
      .references(() => lecture.id, { onDelete: "cascade" }),
    watchedTime: integer("watchedTime").notNull(),
  },
  (table) => ({
    uniqueStudentLecture: unique("uniqueStudentLecture").on(table.studentId, table.lectureId),
  }),
);

export const lecture = pgTable("lecture", {
  ...baseSchema,
  title: text("title").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull(),
});

export const courseLecture = pgTable(
  "courseLecture",
  {
    ...baseSchema,
    courseId: uuid("courseId")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    lectureId: uuid("lectureId")
      .notNull()
      .references(() => lecture.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uniqueCourseLecture: unique("uniqueCourseLecture").on(table.courseId, table.lectureId),
  }),
);

// Not needed

// student code is not saved right now as we dont have an audience for it but we plan to scale it and add it later
// export const code = pgTable("code", {
//   content: text("content").notNull(),
// })

// export const studentCode = pgTable("studentCode", {
//   studentId: text("studentId").notNull().references(() => student.id, { onDelete: "cascade" }),
//   codeId: text("codeId").notNull().references(() => code.id, { onDelete: "cascade" }),
// })

// route should be enum of different routes we can change this later
// export const allowedPages = pgTable("allowedPages", {
//   route: text("route").notNull(),
//   restricted: boolean("restricted").notNull().default(true),
//   schoolId: text("schoolId").notNull().references(() => school.id, { onDelete: "cascade" }),
// })

// we will manually input this since we have only 4 packages for now
// export const packageDetail = pgTable("packageDetail", {
//   packageName: text("packageName").notNull(),
//   packageCost: integer("packageCost").notNull(),
// })

// export const packageCurioCode = pgTable("packageCurioCode", {
//   packageDetailId: text("packageDetailId").notNull().references(() => packageDetail.id, { onDelete: "cascade" }),
//   pythonLevel: integer("pythonLevel").notNull(),
//   turtleLevel: integer("turtleLevel").notNull(),
//   blocklyLevel: integer("blocklyLevel").notNull(),
// })
