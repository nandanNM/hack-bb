// Testing Phase Complete
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import Papa from "papaparse";

import { db } from "../db";
import {
  createQuestionSchema,
  idParamSchema,
  questionCSVRowSchema,
  updateQuestionSchema,
  validateSchema,
} from "./validation";
import { blockly, coding, mcq, paragraph, qna, qnaAnswer } from "../db/schema";
import { ApiError, ApiSuccess } from "../utils/apiResponse.utils";
import { CodingUpdateData, McqUpdateData, ParagraphUpdateData } from "./validation/types";

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(createQuestionSchema, req.body);

    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { qnaType, question, description, options, testCases, keywords, answer, hints } = validation.data;

    const hintsArray = hints && Array.isArray(hints) ? hints : [];

    // create base qna
    const [newQNA] = await db.insert(qna).values({ qnaType }).returning();

    let questionData;

    // MCQ
    if (qnaType === "mcq") {
      const [newQuestion] = await db
        .insert(mcq)
        .values({
          qnaId: newQNA.id,
          question,
          description,
          options: options!,
        })
        .returning();

      questionData = newQuestion;
    }

    // Coding
    else if (qnaType === "coding") {
      const [newQuestion] = await db
        .insert(coding)
        .values({
          qnaId: newQNA.id,
          question,
          description,
          testCases: testCases!,
        })
        .returning();

      questionData = newQuestion;
    }

    // Blockly
    else if (qnaType === "blockly") {
      const [newQuestion] = await db
        .insert(blockly)
        .values({
          qnaId: newQNA.id,
          question,
          description,
          testCases: testCases!,
        })
        .returning();

      questionData = newQuestion;
    }

    // Paragraph
    else {
      const [newQuestion] = await db
        .insert(paragraph)
        .values({
          qnaId: newQNA.id,
          question,
          description,
          keywords: keywords!,
        })
        .returning();

      questionData = newQuestion;
    }

    // answer table
    const [newAnswer] = await db
      .insert(qnaAnswer)
      .values({
        qnaId: newQNA.id,
        answer,
        hints: hintsArray,
      })
      .returning();

    return ApiSuccess(res, `${qnaType} question with answer created successfully`, 201, {
      question: questionData,
      qna: newQNA,
      answer: newAnswer,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllQuestions = async (req: Request, res: Response) => {
  try {
    const [mcqs, codings, paras, answers] = await Promise.all([
      db.select().from(mcq),
      db.select().from(coding),
      db.select().from(paragraph),
      db.select().from(qnaAnswer),
    ]);

    // Create a map of qnaId to answer for quick lookup
    const answerMap = new Map(answers.map((a) => [a.qnaId, a]));

    const allQuestions = [
      ...mcqs.map((q) => ({
        ...q,
        qnaType: "mcq",
        answer: answerMap.get(q.qnaId) || null,
      })),
      ...codings.map((q) => ({
        ...q,
        qnaType: "coding",
        answer: answerMap.get(q.qnaId) || null,
      })),
      ...codings.map((q) => ({
        ...q,
        qnaType: "blockly",
        answer: answerMap.get(q.qnaId) || null,
      })),
      ...paras.map((q) => ({
        ...q,
        qnaType: "paragraph",
        answer: answerMap.get(q.qnaId) || null,
      })),
    ];

    return ApiSuccess(res, "Questions with answers retrieved successfully", 200, allQuestions);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);
    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const { id } = validation.data;

    // Check in all question types
    const [mcqEntry, codingEntry, paraEntry, blocklyEntry] = await Promise.all([
      db.select().from(mcq).where(eq(mcq.id, id)).limit(1),
      db.select().from(coding).where(eq(coding.id, id)).limit(1),
      db.select().from(paragraph).where(eq(paragraph.id, id)).limit(1),
      db.select().from(blockly).where(eq(blockly.id, id)).limit(1),
    ]);

    if (mcqEntry.length > 0) {
      return ApiSuccess(res, "MCQ question fetched successfully", 200, { ...mcqEntry[0], qnaType: "mcq" });
    } else if (codingEntry.length > 0) {
      return ApiSuccess(res, "Coding question fetched successfully", 200, { ...codingEntry[0], qnaType: "coding" });
    } else if (paraEntry.length > 0) {
      return ApiSuccess(res, "Paragraph question fetched successfully", 200, { ...paraEntry[0], qnaType: "paragraph" });
    } else if (blocklyEntry.length > 0) {
      return ApiSuccess(res, "blockly question fetched successfully", 200, { ...blocklyEntry[0], qnaType: "blockly" });
    } else {
      return ApiError(res, "Question not found", 404);
    }
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllMcq = async (req: Request, res: Response) => {
  try {
    const [mcqQuestions, answers] = await Promise.all([db.select().from(mcq), db.select().from(qnaAnswer)]);

    const answerMap = new Map(answers.map((a) => [a.qnaId, a]));

    const questionsWithAnswers = mcqQuestions.map((q) => ({
      ...q,
      qnaType: "mcq",
      answer: answerMap.get(q.qnaId) || null,
    }));

    return ApiSuccess(res, "MCQ questions with answers retrieved successfully", 200, questionsWithAnswers);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllCoding = async (req: Request, res: Response) => {
  try {
    const [codingQuestions, answers] = await Promise.all([db.select().from(coding), db.select().from(qnaAnswer)]);

    const answerMap = new Map(answers.map((a) => [a.qnaId, a]));

    const questionsWithAnswers = codingQuestions.map((q) => ({
      ...q,
      qnaType: "coding",
      answer: answerMap.get(q.qnaId) || null,
    }));

    return ApiSuccess(res, "Coding questions with answers retrieved successfully", 200, questionsWithAnswers);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const getAllPara = async (req: Request, res: Response) => {
  try {
    const [paraQuestions, answers] = await Promise.all([db.select().from(paragraph), db.select().from(qnaAnswer)]);

    const answerMap = new Map(answers.map((a) => [a.qnaId, a]));

    const questionsWithAnswers = paraQuestions.map((q) => ({
      ...q,
      qnaType: "paragraph",
      answer: answerMap.get(q.qnaId) || null,
    }));

    return ApiSuccess(res, "Paragraph questions with answers retrieved successfully", 200, questionsWithAnswers);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
export const getAllBlockly = async (req: Request, res: Response) => {
  try {
    const [blocklyQuestions, answers] = await Promise.all([db.select().from(blockly), db.select().from(qnaAnswer)]);

    const answerMap = new Map(answers.map((a) => [a.qnaId, a]));

    const questionsWithAnswers = blocklyQuestions.map((q) => ({
      ...q,
      qnaType: "blockly",
      answer: answerMap.get(q.qnaId) || null,
    }));

    return ApiSuccess(res, "blockly questions with answers retrieved successfully", 200, questionsWithAnswers);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const validation = validateSchema(idParamSchema, req.params);

    if (!validation.success) {
      return ApiError(res, validation.error, 400);
    }

    const id = validation.data.id;

    const qnaEntry = await db.select().from(qna).where(eq(qna.id, id)).limit(1);

    if (qnaEntry.length === 0) {
      return ApiError(res, "Question not found", 404);
    }

    await db.delete(qna).where(eq(qna.id, id));

    return ApiSuccess(res, "Question deleted successfully", 200);
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const paramValidation = validateSchema(idParamSchema, req.params);

    if (!paramValidation.success) {
      return ApiError(res, paramValidation.error, 400);
    }

    const { id } = paramValidation.data;
    const bodyValidation = validateSchema(updateQuestionSchema, req.body);

    if (!bodyValidation.success) {
      return ApiError(res, bodyValidation.error, 400);
    }

    const { qnaType, question, description, options, testCases, keywords, answer, hints } = bodyValidation.data;

    let existingQuestion;
    let questionTable;
    let updateData: McqUpdateData | CodingUpdateData | ParagraphUpdateData = {};

    if (qnaType === "mcq") {
      questionTable = mcq;
      existingQuestion = await db.select().from(mcq).where(eq(mcq.id, id)).limit(1);
      const mcqUpdate: McqUpdateData = {};
      if (question) mcqUpdate.question = question;
      if (description !== undefined) mcqUpdate.description = description;
      if (options && Array.isArray(options)) mcqUpdate.options = options;
      updateData = mcqUpdate;
    } else if (qnaType === "coding") {
      questionTable = coding;
      existingQuestion = await db.select().from(coding).where(eq(coding.id, id)).limit(1);
      const codingUpdate: CodingUpdateData = {};
      if (question) codingUpdate.question = question;
      if (description !== undefined) codingUpdate.description = description;
      if (testCases) codingUpdate.testCases = testCases;
      updateData = codingUpdate;
    } else if (qnaType === "blockly") {
      questionTable = blockly;
      existingQuestion = await db.select().from(blockly).where(eq(blockly.id, id)).limit(1);
      const blocklyUpdate: CodingUpdateData = {};
      if (question) blocklyUpdate.question = question;
      if (description !== undefined) blocklyUpdate.description = description;
      if (testCases) blocklyUpdate.testCases = testCases;
      updateData = blocklyUpdate;
    } else {
      // paragraph
      questionTable = paragraph;
      existingQuestion = await db.select().from(paragraph).where(eq(paragraph.id, id)).limit(1);
      const paragraphUpdate: ParagraphUpdateData = {};
      if (question) paragraphUpdate.question = question;
      if (description !== undefined) paragraphUpdate.description = description;
      if (keywords && Array.isArray(keywords)) paragraphUpdate.keywords = keywords;
      updateData = paragraphUpdate;
    }

    if (existingQuestion.length === 0) {
      return ApiError(res, `${qnaType} question not found`, 404);
    }

    const qnaId = existingQuestion[0].qnaId;

    const hasAnswerUpdate = answer !== undefined || hints !== undefined;
    const hasQuestionUpdate = Object.keys(updateData).length > 0;

    if (!hasQuestionUpdate && !hasAnswerUpdate) {
      return ApiError(res, "No fields to update", 400);
    }

    if (qnaType === "mcq" && answer !== undefined) {
      const existingOptions =
        existingQuestion[0] && "options" in existingQuestion[0] ? (existingQuestion[0].options as string[]) : [];
      const optionsToCheck = options && Array.isArray(options) ? options : existingOptions;

      if (!optionsToCheck || !Array.isArray(optionsToCheck) || !optionsToCheck.includes(answer)) {
        return ApiError(res, "Answer must be one of the provided options for MCQ", 400);
      }
    }

    let updatedQuestion = existingQuestion[0];
    let updatedAnswer = null;

    if (hasQuestionUpdate) {
      const result = await db.update(questionTable).set(updateData).where(eq(questionTable.id, id)).returning();
      updatedQuestion = result[0];
    }

    if (hasAnswerUpdate) {
      const existingAnswer = await db.select().from(qnaAnswer).where(eq(qnaAnswer.qnaId, qnaId)).limit(1);

      type AnswerUpdateData = {
        answer?: string;
        hints?: string[];
      };

      const answerUpdateData: AnswerUpdateData = {};
      if (answer !== undefined) answerUpdateData.answer = answer;
      if (hints !== undefined) answerUpdateData.hints = Array.isArray(hints) ? hints : [];

      if (existingAnswer.length > 0) {
        const result = await db.update(qnaAnswer).set(answerUpdateData).where(eq(qnaAnswer.qnaId, qnaId)).returning();
        updatedAnswer = result[0];
      } else if (answer) {
        const hintsArray = hints && Array.isArray(hints) ? hints : [];
        const result = await db
          .insert(qnaAnswer)
          .values({
            qnaId,
            answer,
            hints: hintsArray,
          })
          .returning();
        updatedAnswer = result[0];
      }
    } else {
      const existingAnswer = await db.select().from(qnaAnswer).where(eq(qnaAnswer.qnaId, qnaId)).limit(1);
      updatedAnswer = existingAnswer.length > 0 ? existingAnswer[0] : null;
    }

    return ApiSuccess(res, `${qnaType} question updated successfully`, 200, {
      question: updatedQuestion,
      answer: updatedAnswer,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};

export const createQuestionsCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return ApiError(res, "CSV file is required", 400);
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const parsedData = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

    if (parsedData.errors.length > 0) {
      return ApiError(res, "CSV parsing failed", 400, { errors: parsedData.errors });
    }

    const questions = parsedData.data as Array<{
      qnaType: string;
      question: string;
      description?: string;
      options?: string;
      testCases?: string;
      keywords?: string;
      answer: string;
      hints?: string;
    }>;

    const successList: Array<{ type: string; questionId: string; qnaId: string; answerId: string }> = [];
    const failedList: Array<{ question: string; reason: string }> = [];

    for (const q of questions) {
      try {
        const rowValidation = validateSchema(questionCSVRowSchema, q);

        if (!rowValidation.success) {
          failedList.push({
            question: q.question || "N/A",
            reason: rowValidation.error,
          });
          continue;
        }

        const { qnaType, question, description, options, testCases, keywords, answer, hints } = rowValidation.data;

        let questionData;

        const newQNA = await db
          .insert(qna)
          .values({
            qnaType: qnaType,
          })
          .returning();

        if (qnaType === "mcq") {
          if (!options) {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "options are required for MCQ" });
            continue;
          }

          const optionsArray = options.split("|").map((opt) => opt.trim());

          if (!optionsArray.includes(answer.trim())) {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "Answer must be one of the provided options for MCQ" });
            continue;
          }

          const newQuestion = await db
            .insert(mcq)
            .values({ qnaId: newQNA[0].id, question, description, options: optionsArray })
            .returning();

          questionData = newQuestion[0];
        } else if (qnaType === "coding") {
          if (!testCases) {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "testCases are required for Coding questions" });
            continue;
          }

          let testCasesArray;
          try {
            testCasesArray = typeof testCases === "string" ? JSON.parse(testCases) : testCases;
          } catch {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "Invalid JSON format for testCases" });
            continue;
          }

          const newQuestion = await db
            .insert(coding)
            .values({ qnaId: newQNA[0].id, question, description, testCases: testCasesArray })
            .returning();

          questionData = newQuestion[0];
        } else if (qnaType === "blockly") {
          if (!testCases) {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "testCases are required for Coding questions" });
            continue;
          }

          let testCasesArray;
          try {
            testCasesArray = typeof testCases === "string" ? JSON.parse(testCases) : testCases;
          } catch {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "Invalid JSON format for testCases" });
            continue;
          }

          const newQuestion = await db
            .insert(blockly)
            .values({ qnaId: newQNA[0].id, question, description, testCases: testCasesArray })
            .returning();

          questionData = newQuestion[0];
        } else {
          if (!keywords) {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "keywords are required for Paragraph questions" });
            continue;
          }

          let keywordsArray;
          try {
            keywordsArray = typeof keywords === "string" ? JSON.parse(keywords) : keywords;
          } catch {
            await db.delete(qna).where(eq(qna.id, newQNA[0].id));
            failedList.push({ question, reason: "Invalid JSON format for keywords" });
            continue;
          }

          const newQuestion = await db
            .insert(paragraph)
            .values({ qnaId: newQNA[0].id, question, description, keywords: keywordsArray })
            .returning();

          questionData = newQuestion[0];
        }

        let hintsArray: string[] = [];
        if (hints && hints.trim() !== "") {
          hintsArray = hints.split("|").map((h) => h.trim());
        }

        const newAnswer = await db
          .insert(qnaAnswer)
          .values({
            qnaId: newQNA[0].id,
            answer: answer.trim(),
            hints: hintsArray,
          })
          .returning();

        successList.push({
          type: qnaType,
          questionId: questionData.id,
          qnaId: newQNA[0].id,
          answerId: newAnswer[0].id,
        });
      } catch (error) {
        failedList.push({
          question: q.question || "N/A",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return ApiSuccess(res, `Bulk question with answer creation completed`, 200, {
      total: questions.length,
      successful: successList.length,
      failed: failedList.length,
      successList,
      failedList,
    });
  } catch {
    return ApiError(res, "Internal Server Error", 500);
  }
};
