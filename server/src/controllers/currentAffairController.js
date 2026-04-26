import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  ensureCurrentAffairQuestionPool,
  getCurrentAffairsCacheKey,
  getCurrentAffairsConfig,
  pickQuestionsForCurrentAffairsExam,
  validateCurrentAffairsRequest
} from "../utils/currentAffairs.js";

const endOfDay = () => {
  const value = new Date();
  value.setHours(23, 59, 59, 999);
  return value;
};

const buildExamQuestions = (poolQuestions) =>
  poolQuestions.map((question) => {
    const options = question.options.map((option) => ({
      _id: new mongoose.Types.ObjectId(),
      text: option.text
    }));
    const correctOptionIds = options
      .filter((option, index) => question.options[index].isCorrect)
      .map((option) => option._id);

    return {
      prompt: question.prompt,
      type: "single",
      marks: question.marks,
      explanation: question.explanation,
      eventDate: question.eventDate,
      currentAffairCategory: question.currentAffairCategory,
      sourceTitle: question.sourceTitle,
      sourceUrl: question.sourceUrl,
      options,
      correctOptionIds
    };
  });

export const getCurrentAffairsOptions = asyncHandler(async (req, res) => {
  res.json(getCurrentAffairsConfig());
});

export const createCurrentAffairsExam = asyncHandler(async (req, res) => {
  const config = validateCurrentAffairsRequest(req.body);
  const pool = await ensureCurrentAffairQuestionPool(config);

  if (!pool.length) {
    res.status(503);
    throw new Error("Current affairs data could not be prepared right now. Please try again shortly.");
  }

  const selectedQuestions = pickQuestionsForCurrentAffairsExam(pool, config.questionCount);

  if (!selectedQuestions.length) {
    res.status(503);
    throw new Error("Not enough current affairs questions were available for this selection.");
  }

  const normalizedQuestions = buildExamQuestions(selectedQuestions);
  const now = new Date();
  const cacheKey = getCurrentAffairsCacheKey(config);

  const exam = await Exam.create({
    title:
      config.category === "state"
        ? `${config.stateName} Current Affairs`
        : "India Current Affairs",
    description:
      config.category === "state"
        ? `Auto-generated current affairs exam for ${config.stateName} in ${config.language}.`
        : `Auto-generated India current affairs exam in ${config.language}.`,
    subject: "Current Affairs",
    topic: config.category === "state" ? config.stateName : "India",
    playlist: config.language === "hindi" ? "Hindi Feed" : "English Feed",
    examKind: "current-affairs",
    language: config.language,
    currentAffairsCategory: config.category,
    stateName: config.stateName,
    duration: config.duration,
    totalMarks: normalizedQuestions.length,
    negativeMarking: 0.25,
    maxAttempts: 1,
    maxSkips: 5,
    status: "published",
    isLocked: false,
    lockedUntil: null,
    startTime: new Date(now.getTime() - 60 * 1000),
    endTime: endOfDay(),
    shuffleQuestions: false,
    isSystemGenerated: true,
    generatedFromCacheKey: cacheKey,
    createdBy: req.user._id,
    questions: normalizedQuestions
  });

  res.status(201).json({
    examId: exam._id,
    title: exam.title,
    description: exam.description,
    questionCount: normalizedQuestions.length,
    duration: exam.duration,
    language: exam.language,
    category: exam.currentAffairsCategory,
    stateName: exam.stateName,
    maxSkips: exam.maxSkips
  });
});
