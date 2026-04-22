import express from "express";
import {
  addQuestionsToExam,
  createExam,
  deleteExam,
  getAdminExams,
  getAvailableExams,
  getDashboardAnalytics,
  getExamById,
  importQuestions,
  getResultsForExam,
  saveAnswer,
  startExamAttempt,
  submitExam,
  updateExam
} from "../controllers/examController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.get("/available", protect, authorize("user", "admin"), getAvailableExams);
router.get("/admin", protect, authorize("admin"), getAdminExams);
router.get("/analytics", protect, authorize("admin"), getDashboardAnalytics);
router.post("/import-questions", protect, authorize("admin"), upload.single("file"), importQuestions);
router.get("/:id", protect, getExamById);
router.post("/", protect, authorize("admin"), createExam);
router.put("/:id", protect, authorize("admin"), updateExam);
router.delete("/:id", protect, authorize("admin"), deleteExam);
router.put("/:id/questions", protect, authorize("admin"), addQuestionsToExam);
router.post("/:id/start", protect, authorize("user", "admin"), startExamAttempt);
router.get("/:id/results", protect, authorize("admin"), getResultsForExam);
router.put("/attempts/:resultId/answer", protect, authorize("user", "admin"), saveAnswer);
router.post("/attempts/:resultId/submit", protect, authorize("user", "admin"), submitExam);

export default router;
