CREATE TYPE "public"."difficultyLevel" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."qnaType" AS ENUM('mcq', 'coding', 'paragraph');--> statement-breakpoint
CREATE TYPE "public"."controllerRole" AS ENUM('parent', 'admin', 'superAdmin');--> statement-breakpoint
CREATE TYPE "public"."studentRole" AS ENUM('individual', 'school');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'completed', 'inProgress');--> statement-breakpoint
CREATE TABLE "assignment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lectureId" uuid NOT NULL,
	"qnaId" uuid NOT NULL,
	"difficultyLevel" "difficultyLevel" NOT NULL,
	"qnaType" "qnaType" NOT NULL,
	"assignmentLevel" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignmentCompleted" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"assignmentId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"status" "status" NOT NULL,
	CONSTRAINT "uniqueAssignmentStudent" UNIQUE("assignmentId","studentId")
);
--> statement-breakpoint
CREATE TABLE "coding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"qnaId" uuid NOT NULL,
	"question" text NOT NULL,
	"testCases" jsonb NOT NULL,
	CONSTRAINT "coding_qnaId_unique" UNIQUE("qnaId")
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"assignmentId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controller" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"phoneNumber" bigint NOT NULL,
	"controllerRole" "controllerRole" NOT NULL,
	CONSTRAINT "controller_phoneNumber_unique" UNIQUE("phoneNumber")
);
--> statement-breakpoint
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"courseName" text NOT NULL,
	"courseDetail" text NOT NULL,
	"courseImage" text NOT NULL,
	"link" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courseInstructor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"courseId" uuid NOT NULL,
	"instructorId" uuid NOT NULL,
	CONSTRAINT "uniqueCourseInstructor" UNIQUE("courseId","instructorId")
);
--> statement-breakpoint
CREATE TABLE "instructor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"detail" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecture" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lectureWatched" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"studentId" uuid NOT NULL,
	"lectureId" uuid NOT NULL,
	"watchedTime" integer NOT NULL,
	CONSTRAINT "uniqueStudentLecture" UNIQUE("studentId","lectureId")
);
--> statement-breakpoint
CREATE TABLE "mcq" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"qnaId" uuid NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	CONSTRAINT "mcq_qnaId_unique" UNIQUE("qnaId")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"schoolId" uuid NOT NULL,
	"curioCode" boolean DEFAULT false NOT NULL,
	"curioAi" boolean DEFAULT false NOT NULL,
	"curioBot" boolean DEFAULT false NOT NULL,
	"curioThink" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paragraph" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"qnaId" uuid NOT NULL,
	"question" text NOT NULL,
	"keywords" jsonb NOT NULL,
	CONSTRAINT "paragraph_qnaId_unique" UNIQUE("qnaId")
);
--> statement-breakpoint
CREATE TABLE "passwordResets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"userType" text NOT NULL,
	"tokenHash" text NOT NULL,
	"issuedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"ipAddress" varchar(45),
	CONSTRAINT "passwordResets_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "qna" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"qnaType" "qnaType" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qnaAnswer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"qnaId" uuid NOT NULL,
	"answer" text NOT NULL,
	"hints" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qnaCompleted" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"qnaId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	"status" "status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"schoolAddress" text,
	"schoolZip" varchar(10),
	"schoolCity" varchar(100),
	"schoolState" varchar(100),
	"schoolCountry" varchar(100),
	"schoolLogoUrl" varchar(1000),
	"schoolName" varchar(250) NOT NULL,
	"schoolEmail" varchar(320) NOT NULL,
	"domain" varchar(200) NOT NULL,
	"themePrimary" varchar(20),
	"themeSecondary" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "schoolController" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"schoolId" uuid NOT NULL,
	"controllerId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schoolDomain" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"domain" varchar(200) NOT NULL,
	"schoolId" uuid NOT NULL,
	CONSTRAINT "schoolDomain_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "schoolStudent" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"schoolId" uuid NOT NULL,
	"studentId" uuid NOT NULL,
	CONSTRAINT "uniqueSchoolStudent" UNIQUE("schoolId","studentId")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"level" integer NOT NULL,
	"role" "studentRole" NOT NULL,
	"class" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"accountId" uuid NOT NULL,
	"providerId" text NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" uuid NOT NULL,
	"impersonatedBy" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"banReason" text,
	"banExpires" timestamp,
	"schoolId" uuid,
	"studentId" uuid,
	"controllerId" uuid,
	"isActive" boolean,
	"disabledAt" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_lectureId_lecture_id_fk" FOREIGN KEY ("lectureId") REFERENCES "public"."lecture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_qnaId_qna_id_fk" FOREIGN KEY ("qnaId") REFERENCES "public"."qna"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignmentCompleted" ADD CONSTRAINT "assignmentCompleted_assignmentId_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignmentCompleted" ADD CONSTRAINT "assignmentCompleted_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coding" ADD CONSTRAINT "coding_qnaId_qna_id_fk" FOREIGN KEY ("qnaId") REFERENCES "public"."qna"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_assignmentId_assignment_id_fk" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courseInstructor" ADD CONSTRAINT "courseInstructor_courseId_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courseInstructor" ADD CONSTRAINT "courseInstructor_instructorId_instructor_id_fk" FOREIGN KEY ("instructorId") REFERENCES "public"."instructor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectureWatched" ADD CONSTRAINT "lectureWatched_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectureWatched" ADD CONSTRAINT "lectureWatched_lectureId_lecture_id_fk" FOREIGN KEY ("lectureId") REFERENCES "public"."lecture"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq" ADD CONSTRAINT "mcq_qnaId_qna_id_fk" FOREIGN KEY ("qnaId") REFERENCES "public"."qna"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_schoolId_school_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paragraph" ADD CONSTRAINT "paragraph_qnaId_qna_id_fk" FOREIGN KEY ("qnaId") REFERENCES "public"."qna"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qnaAnswer" ADD CONSTRAINT "qnaAnswer_qnaId_qna_id_fk" FOREIGN KEY ("qnaId") REFERENCES "public"."qna"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qnaCompleted" ADD CONSTRAINT "qnaCompleted_qnaId_qna_id_fk" FOREIGN KEY ("qnaId") REFERENCES "public"."qna"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qnaCompleted" ADD CONSTRAINT "qnaCompleted_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schoolController" ADD CONSTRAINT "schoolController_schoolId_school_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schoolController" ADD CONSTRAINT "schoolController_controllerId_controller_id_fk" FOREIGN KEY ("controllerId") REFERENCES "public"."controller"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schoolDomain" ADD CONSTRAINT "schoolDomain_schoolId_school_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schoolStudent" ADD CONSTRAINT "schoolStudent_schoolId_school_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schoolStudent" ADD CONSTRAINT "schoolStudent_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_schoolId_school_id_fk" FOREIGN KEY ("schoolId") REFERENCES "public"."school"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_studentId_student_id_fk" FOREIGN KEY ("studentId") REFERENCES "public"."student"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_controllerId_controller_id_fk" FOREIGN KEY ("controllerId") REFERENCES "public"."controller"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uqSchoolsDomain" ON "school" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "accountUserIdIdx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessionUserIdIdx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "uqUserEmailSchool" ON "user" USING btree ("email","schoolId");--> statement-breakpoint
CREATE INDEX "idxUsersSchool" ON "user" USING btree ("schoolId");--> statement-breakpoint
CREATE INDEX "verificationIdentifierIdx" ON "verification" USING btree ("identifier");