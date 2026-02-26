import { Router } from "express";

import {
  createQuestion,
  createQuestionsCSV,
  deleteQuestion,
  getAllBlockly,
  getAllCoding,
  getAllMcq,
  getAllPara,
  getAllQuestions,
  updateQuestion,
} from "../controllers/question.controller";
import { requireSuperAdmin } from "../middleware/role.middleware";
import upload from "../middleware/upload.middleware";

const questionRouter = Router();

questionRouter.get("/get-all-mcq", requireSuperAdmin, getAllMcq);
questionRouter.get("/get-all-para", requireSuperAdmin, getAllPara);
questionRouter.get("/get-all-coding", requireSuperAdmin, getAllCoding);
questionRouter.get("/get-all-blockly", requireSuperAdmin, getAllBlockly);
questionRouter.post("/create-question", requireSuperAdmin, createQuestion);
questionRouter.get("/get-all-questions", requireSuperAdmin, getAllQuestions);
questionRouter.put("/update-question/:id", requireSuperAdmin, updateQuestion);
questionRouter.delete("/delete-question/:id", requireSuperAdmin, deleteQuestion);
questionRouter.post("/create-question-csv", requireSuperAdmin, upload.single("file"), createQuestionsCSV);

export default questionRouter;
