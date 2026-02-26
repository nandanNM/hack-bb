import { and, count, desc, eq, sql } from "drizzle-orm";
import { Response } from "express";

import { db } from "../db";
import {
  attentionStudentsQuerySchema,
  dashboardStatsQuerySchema,
  topPerformersQuerySchema,
  validateSchema,
} from "./validation";
import { user } from "../db/auth-schema";
import {
  assignment,
  assignmentCompleted,
  comment,
  course,
  lecture,
  lectureWatched,
  school,
  schoolStudent,
  student,
} from "../db/schema";
import { AuthenticatedRequest } from "../types/index.types";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";

type Request = AuthenticatedRequest;

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(dashboardStatsQuerySchema, req.query);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { schoolId } = validation.data;

    // Run all queries concurrently for better performance
    const [
      studentData,
      lectureCount,
      courseCount,
      assignmentCount,
      completedAssignments,
      totalAttempted,
      activeLearners,
      totalWatchTime,
    ] = await Promise.all([
      schoolId
        ? db.select({ count: count() }).from(schoolStudent).where(eq(schoolStudent.schoolId, schoolId))
        : db.select({ count: count() }).from(student),
      db.select({ count: count() }).from(lecture),
      db.select({ count: count() }).from(course),
      db.select({ count: count() }).from(assignment),
      db.select({ count: count() }).from(assignmentCompleted).where(eq(assignmentCompleted.status, "completed")),
      db.select({ count: count() }).from(assignmentCompleted),
      db.select({ studentId: lectureWatched.studentId }).from(lectureWatched).groupBy(lectureWatched.studentId),
      db.select({ total: sql<number>`COALESCE(SUM(${lectureWatched.watchedTime}), 0)` }).from(lectureWatched),
    ]);

    const studentCount = studentData[0]?.count ?? 0;

    return ApiSuccess(res, "Dashboard stats fetched successfully", 200, {
      counts: {
        students: studentCount,
        lectures: lectureCount[0]?.count ?? 0,
        courses: courseCount[0]?.count ?? 0,
        assignments: assignmentCount[0]?.count ?? 0,
      },
      activity: {
        completedAssignments: completedAssignments[0]?.count ?? 0,
        totalAttempted: totalAttempted[0]?.count ?? 0,
        activeLearners: activeLearners.length,
        totalWatchTimeMinutes: Math.round((totalWatchTime[0]?.total ?? 0) / 60),
      },
      rates: {
        completionRate:
          totalAttempted[0]?.count > 0
            ? Math.round(((completedAssignments[0]?.count ?? 0) / totalAttempted[0].count) * 100)
            : 0,
        activeRate: studentCount > 0 ? Math.round((activeLearners.length / studentCount) * 100) : 0,
      },
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getTopPerformers = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(topPerformersQuerySchema, req.query);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { limit, schoolId } = validation.data;

    let studentsQuery;
    if (schoolId) {
      studentsQuery = db
        .select({
          studentId: student.id,
          studentName: user.name,
          studentEmail: user.email,
          studentClass: student.class,
          studentLevel: student.level,
          completedCount: count(assignmentCompleted.id),
        })
        .from(student)
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
        .leftJoin(
          assignmentCompleted,
          and(eq(student.id, assignmentCompleted.studentId), eq(assignmentCompleted.status, "completed")),
        )
        .where(eq(schoolStudent.schoolId, schoolId))
        .groupBy(student.id, user.name, user.email)
        .orderBy(desc(count(assignmentCompleted.id)))
        .limit(limit);
    } else {
      studentsQuery = db
        .select({
          studentId: student.id,
          studentName: user.name,
          studentEmail: user.email,
          studentClass: student.class,
          studentLevel: student.level,
          completedCount: count(assignmentCompleted.id),
        })
        .from(student)
        .innerJoin(user, eq(user.studentId, student.id))
        .leftJoin(
          assignmentCompleted,
          and(eq(student.id, assignmentCompleted.studentId), eq(assignmentCompleted.status, "completed")),
        )
        .groupBy(student.id, user.name, user.email)
        .orderBy(desc(count(assignmentCompleted.id)))
        .limit(limit);
    }

    const topStudents = await studentsQuery;

    const studentsWithWatchTime = await Promise.all(
      topStudents.map(async (s) => {
        const watchTime = await db
          .select({ total: sql<number>`COALESCE(SUM(${lectureWatched.watchedTime}), 0)` })
          .from(lectureWatched)
          .where(eq(lectureWatched.studentId, s.studentId));

        return {
          ...s,
          totalWatchTimeMinutes: Math.round((watchTime[0]?.total ?? 0) / 60),
        };
      }),
    );

    return ApiSuccess(res, "Top performers fetched successfully", 200, studentsWithWatchTime);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getStudentsNeedingAttention = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(attentionStudentsQuerySchema, req.query);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { schoolId, threshold } = validation.data;

    // Get all students
    let studentsData;
    if (schoolId) {
      studentsData = await db
        .select({
          id: student.id,
          name: user.name,
          email: user.email,
          class: student.class,
          level: student.level,
        })
        .from(student)
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
        .where(eq(schoolStudent.schoolId, schoolId));
    } else {
      studentsData = await db
        .select({
          id: student.id,
          name: user.name,
          email: user.email,
          class: student.class,
          level: student.level,
        })
        .from(student)
        .innerJoin(user, eq(user.studentId, student.id));
    }

    // Calculate progress for each student
    const studentsWithProgress = await Promise.all(
      studentsData.map(async (s) => {
        const completed = await db
          .select({ count: count() })
          .from(assignmentCompleted)
          .where(and(eq(assignmentCompleted.studentId, s.id), eq(assignmentCompleted.status, "completed")));

        const totalAssignments = await db.select({ count: count() }).from(assignment);

        const progress =
          totalAssignments[0]?.count > 0
            ? Math.round(((completed[0]?.count ?? 0) / totalAssignments[0].count) * 100)
            : 0;

        const watchHistory = await db
          .select({ count: count() })
          .from(lectureWatched)
          .where(eq(lectureWatched.studentId, s.id));

        return {
          ...s,
          progress,
          completedAssignments: completed[0]?.count ?? 0,
          videosWatched: watchHistory[0]?.count ?? 0,
        };
      }),
    );

    // Filter by threshold
    const needsAttention = studentsWithProgress
      .filter((s) => s.progress < threshold)
      .sort((a, b) => a.progress - b.progress);

    return ApiSuccess(res, "Students needing attention fetched", 200, {
      threshold,
      count: needsAttention.length,
      students: needsAttention,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getLectureEngagement = async (req: Request, res: Response) => {
  try {
    const allLectures = await db.select().from(lecture);

    const lectureStats = await Promise.all(
      allLectures.map(async (lec) => {
        // Get viewer count
        const viewers = await db
          .select({ count: count() })
          .from(lectureWatched)
          .where(eq(lectureWatched.lectureId, lec.id));

        // Get total watch time
        const watchTime = await db
          .select({ total: sql<number>`COALESCE(SUM(${lectureWatched.watchedTime}), 0)` })
          .from(lectureWatched)
          .where(eq(lectureWatched.lectureId, lec.id));

        // Get assignment count for this lecture
        const assignments = await db
          .select({ count: count() })
          .from(assignment)
          .where(eq(assignment.lectureId, lec.id));

        // Get completion stats for assignments in this lecture
        const completedAssignments = await db
          .select({ count: count() })
          .from(assignmentCompleted)
          .innerJoin(assignment, eq(assignmentCompleted.assignmentId, assignment.id))
          .where(and(eq(assignment.lectureId, lec.id), eq(assignmentCompleted.status, "completed")));

        return {
          lectureId: lec.id,
          title: lec.title,
          description: lec.description,
          viewerCount: viewers[0]?.count ?? 0,
          totalWatchTimeMinutes: Math.round((watchTime[0]?.total ?? 0) / 60),
          averageWatchTime: viewers[0]?.count > 0 ? Math.round((watchTime[0]?.total ?? 0) / viewers[0].count / 60) : 0,
          assignmentCount: assignments[0]?.count ?? 0,
          completedAssignments: completedAssignments[0]?.count ?? 0,
        };
      }),
    );

    // Sort by viewer count
    lectureStats.sort((a, b) => b.viewerCount - a.viewerCount);

    return ApiSuccess(res, "Lecture engagement analytics fetched", 200, lectureStats);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAssignmentDifficultyAnalysis = async (req: Request, res: Response) => {
  try {
    const allAssignments = await db
      .select({
        id: assignment.id,
        difficultyLevel: assignment.difficultyLevel,
        qnaType: assignment.qnaType,
        lectureId: assignment.lectureId,
      })
      .from(assignment);

    // Group by difficulty
    const difficultyStats = {
      easy: { total: 0, completed: 0, attempted: 0 },
      medium: { total: 0, completed: 0, attempted: 0 },
      hard: { total: 0, completed: 0, attempted: 0 },
    };

    for (const a of allAssignments) {
      const level = a.difficultyLevel as keyof typeof difficultyStats;
      difficultyStats[level].total++;

      const completions = await db
        .select({ status: assignmentCompleted.status })
        .from(assignmentCompleted)
        .where(eq(assignmentCompleted.assignmentId, a.id));

      difficultyStats[level].attempted += completions.length;
      difficultyStats[level].completed += completions.filter((c) => c.status === "completed").length;
    }

    // Calculate rates
    const difficultyAnalysis = Object.entries(difficultyStats).map(([level, stats]) => ({
      difficulty: level,
      totalAssignments: stats.total,
      totalAttempts: stats.attempted,
      completedCount: stats.completed,
      completionRate: stats.attempted > 0 ? Math.round((stats.completed / stats.attempted) * 100) : 0,
    }));

    // Group by type
    const typeStats = {
      mcq: { total: 0, completed: 0 },
      coding: { total: 0, completed: 0 },
      paragraph: { total: 0, completed: 0 },
    };

    for (const a of allAssignments) {
      const type = a.qnaType as keyof typeof typeStats;
      typeStats[type].total++;

      const completions = await db
        .select()
        .from(assignmentCompleted)
        .where(and(eq(assignmentCompleted.assignmentId, a.id), eq(assignmentCompleted.status, "completed")));

      typeStats[type].completed += completions.length;
    }

    const typeAnalysis = Object.entries(typeStats).map(([type, stats]) => ({
      type,
      totalAssignments: stats.total,
      completedCount: stats.completed,
    }));

    return ApiSuccess(res, "Assignment difficulty analysis fetched", 200, {
      byDifficulty: difficultyAnalysis,
      byType: typeAnalysis,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getSchoolWiseStats = async (req: Request, res: Response) => {
  try {
    const allSchools = await db.select().from(school);

    const schoolStats = await Promise.all(
      allSchools.map(async (sch) => {
        // Get student count
        const students = await db
          .select({ count: count() })
          .from(schoolStudent)
          .where(eq(schoolStudent.schoolId, sch.id));

        // Get student IDs for this school
        const studentIds = await db
          .select({ studentId: schoolStudent.studentId })
          .from(schoolStudent)
          .where(eq(schoolStudent.schoolId, sch.id));

        let completedCount = 0;
        let totalWatchTime = 0;
        let activeStudents = 0;

        for (const s of studentIds) {
          // Completed assignments
          const completed = await db
            .select({ count: count() })
            .from(assignmentCompleted)
            .where(and(eq(assignmentCompleted.studentId, s.studentId), eq(assignmentCompleted.status, "completed")));
          completedCount += completed[0]?.count ?? 0;

          // Watch time
          const watchTime = await db
            .select({ total: sql<number>`COALESCE(SUM(${lectureWatched.watchedTime}), 0)` })
            .from(lectureWatched)
            .where(eq(lectureWatched.studentId, s.studentId));
          totalWatchTime += watchTime[0]?.total ?? 0;

          // Check if active
          const hasWatched = await db
            .select({ count: count() })
            .from(lectureWatched)
            .where(eq(lectureWatched.studentId, s.studentId));
          if ((hasWatched[0]?.count ?? 0) > 0) activeStudents++;
        }

        return {
          schoolId: sch.id,
          schoolName: sch.schoolName,
          domain: sch.domain,
          studentCount: students[0]?.count ?? 0,
          completedAssignments: completedCount,
          totalWatchTimeMinutes: Math.round(totalWatchTime / 60),
          activeStudents,
          activeRate:
            (students[0]?.count ?? 0) > 0 ? Math.round((activeStudents / (students[0]?.count ?? 1)) * 100) : 0,
        };
      }),
    );

    // Sort by student count
    schoolStats.sort((a, b) => b.studentCount - a.studentCount);

    return ApiSuccess(res, "School-wise statistics fetched", 200, schoolStats);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const { limit = 20, schoolId } = req.query;

    // Get recent assignment completions
    let completionsQuery;
    if (schoolId) {
      completionsQuery = db
        .select({
          type: sql<string>`'assignment_completed'`,
          studentId: student.id,
          studentName: user.name,
          detail: lecture.title,
          timestamp: assignmentCompleted.updatedAt,
        })
        .from(assignmentCompleted)
        .innerJoin(student, eq(assignmentCompleted.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
        .innerJoin(assignment, eq(assignmentCompleted.assignmentId, assignment.id))
        .innerJoin(lecture, eq(assignment.lectureId, lecture.id))
        .where(and(eq(schoolStudent.schoolId, schoolId as string), eq(assignmentCompleted.status, "completed")))
        .orderBy(desc(assignmentCompleted.updatedAt))
        .limit(Number(limit));
    } else {
      completionsQuery = db
        .select({
          type: sql<string>`'assignment_completed'`,
          studentId: student.id,
          studentName: user.name,
          detail: lecture.title,
          timestamp: assignmentCompleted.updatedAt,
        })
        .from(assignmentCompleted)
        .innerJoin(student, eq(assignmentCompleted.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(assignment, eq(assignmentCompleted.assignmentId, assignment.id))
        .innerJoin(lecture, eq(assignment.lectureId, lecture.id))
        .where(eq(assignmentCompleted.status, "completed"))
        .orderBy(desc(assignmentCompleted.updatedAt))
        .limit(Number(limit));
    }

    const recentCompletions = await completionsQuery;

    // Get recent video watches
    let watchesQuery;
    if (schoolId) {
      watchesQuery = db
        .select({
          type: sql<string>`'video_watched'`,
          studentId: student.id,
          studentName: user.name,
          detail: lecture.title,
          timestamp: lectureWatched.updatedAt,
        })
        .from(lectureWatched)
        .innerJoin(student, eq(lectureWatched.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
        .innerJoin(lecture, eq(lectureWatched.lectureId, lecture.id))
        .where(eq(schoolStudent.schoolId, schoolId as string))
        .orderBy(desc(lectureWatched.updatedAt))
        .limit(Number(limit));
    } else {
      watchesQuery = db
        .select({
          type: sql<string>`'video_watched'`,
          studentId: student.id,
          studentName: user.name,
          detail: lecture.title,
          timestamp: lectureWatched.updatedAt,
        })
        .from(lectureWatched)
        .innerJoin(student, eq(lectureWatched.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(lecture, eq(lectureWatched.lectureId, lecture.id))
        .orderBy(desc(lectureWatched.updatedAt))
        .limit(Number(limit));
    }

    const recentWatches = await watchesQuery;

    // Get recent comments
    let commentsQuery;
    if (schoolId) {
      commentsQuery = db
        .select({
          type: sql<string>`'comment_added'`,
          studentId: student.id,
          studentName: user.name,
          detail: comment.content,
          timestamp: comment.createdAt,
        })
        .from(comment)
        .innerJoin(student, eq(comment.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
        .where(eq(schoolStudent.schoolId, schoolId as string))
        .orderBy(desc(comment.createdAt))
        .limit(Number(limit));
    } else {
      commentsQuery = db
        .select({
          type: sql<string>`'comment_added'`,
          studentId: student.id,
          studentName: user.name,
          detail: comment.content,
          timestamp: comment.createdAt,
        })
        .from(comment)
        .innerJoin(student, eq(comment.studentId, student.id))
        .innerJoin(user, eq(user.studentId, student.id))
        .orderBy(desc(comment.createdAt))
        .limit(Number(limit));
    }

    const recentComments = await commentsQuery;

    // Combine and sort by timestamp
    const allActivity = [...recentCompletions, ...recentWatches, ...recentComments]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, Number(limit));

    return ApiSuccess(res, "Recent activity fetched", 200, allActivity);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getClassWiseBreakdown = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;

    if (!schoolId) {
      return ApiError(res, "schoolId is required", 400);
    }

    // Get all students in the school grouped by class
    const students = await db
      .select({
        id: student.id,
        name: user.name,
        class: student.class,
        level: student.level,
      })
      .from(student)
      .innerJoin(user, eq(user.studentId, student.id))
      .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
      .where(eq(schoolStudent.schoolId, schoolId as string));

    // Group by class
    const classMap = new Map<
      string,
      {
        students: number;
        totalCompleted: number;
        totalWatchTime: number;
        levels: number[];
      }
    >();

    for (const s of students) {
      const className = s.class || "Unassigned";
      if (!classMap.has(className)) {
        classMap.set(className, { students: 0, totalCompleted: 0, totalWatchTime: 0, levels: [] });
      }

      const classData = classMap.get(className)!;
      classData.students++;
      classData.levels.push(s.level);

      // Get completed assignments
      const completed = await db
        .select({ count: count() })
        .from(assignmentCompleted)
        .where(and(eq(assignmentCompleted.studentId, s.id), eq(assignmentCompleted.status, "completed")));
      classData.totalCompleted += completed[0]?.count ?? 0;

      // Get watch time
      const watchTime = await db
        .select({ total: sql<number>`COALESCE(SUM(${lectureWatched.watchedTime}), 0)` })
        .from(lectureWatched)
        .where(eq(lectureWatched.studentId, s.id));
      classData.totalWatchTime += watchTime[0]?.total ?? 0;
    }

    const classBreakdown = Array.from(classMap.entries()).map(([className, data]) => ({
      class: className,
      studentCount: data.students,
      averageLevel:
        data.levels.length > 0 ? Math.round(data.levels.reduce((a, b) => a + b, 0) / data.levels.length) : 0,
      totalCompletedAssignments: data.totalCompleted,
      averageCompletedPerStudent: data.students > 0 ? Math.round(data.totalCompleted / data.students) : 0,
      totalWatchTimeMinutes: Math.round(data.totalWatchTime / 60),
      averageWatchTimePerStudent: data.students > 0 ? Math.round(data.totalWatchTime / data.students / 60) : 0,
    }));

    // Sort by class name
    classBreakdown.sort((a, b) => a.class.localeCompare(b.class));

    return ApiSuccess(res, "Class-wise breakdown fetched", 200, classBreakdown);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getLevelProgressionStats = async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.query;

    let studentsQuery;
    if (schoolId) {
      studentsQuery = db
        .select({ level: student.level })
        .from(student)
        .innerJoin(schoolStudent, eq(student.id, schoolStudent.studentId))
        .where(eq(schoolStudent.schoolId, schoolId as string));
    } else {
      studentsQuery = db.select({ level: student.level }).from(student);
    }

    const students = await studentsQuery;

    // Group by level
    const levelCounts = new Map<number, number>();
    for (const s of students) {
      levelCounts.set(s.level, (levelCounts.get(s.level) ?? 0) + 1);
    }

    const levelDistribution = Array.from(levelCounts.entries())
      .map(([level, count]) => ({
        level,
        studentCount: count,
        percentage: students.length > 0 ? Math.round((count / students.length) * 100) : 0,
      }))
      .sort((a, b) => a.level - b.level);

    return ApiSuccess(res, "Level progression stats fetched", 200, {
      totalStudents: students.length,
      averageLevel:
        students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.level, 0) / students.length) : 0,
      distribution: levelDistribution,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
