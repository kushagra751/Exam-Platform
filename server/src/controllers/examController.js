import mongoose from "mongoose";
import mammoth from "mammoth";
import Exam from "../models/Exam.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  calculateResultStats,
  getMaximumMarks,
  sanitizeExamForCandidate
} from "../utils/examHelpers.js";
import { parseFlexibleNumber } from "../utils/numberParser.js";
import { parseImportedQuestions } from "../utils/questionImportParser.js";

const validateSchedule = (startTime, endTime) => {
  if (new Date(startTime) >= new Date(endTime)) {
    throw new Error("End time must be greater than start time");
  }
};

const parseAttemptLimit = (value) => {
  if (value === "unlimited") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
};

const normalizeSections = (sections = [], questions = [], duration = 0) => {
  const normalizedSections = (sections || [])
    .map((section) => ({
      title: section.title?.trim() || "",
      duration: parseFlexibleNumber(section.duration || 0),
      cutoffMarks: parseFlexibleNumber(section.cutoffMarks || 0)
    }))
    .filter((section) => section.title);

  if (normalizedSections.length > 0) {
    return normalizedSections;
  }

  const uniqueTitles = [...new Set((questions || []).map((question) => question.section?.trim() || "General"))];

  return uniqueTitles.map((title, index) => ({
    title,
    duration: index === 0 ? parseFlexibleNumber(duration || 0) : 0,
    cutoffMarks: 0
  }));
};

const validateExamPayload = ({ title, duration, totalMarks, negativeMarking, questions = [], status, sections = [] }) => {
  const parsedDuration = parseFlexibleNumber(duration);
  const parsedTotalMarks = parseFlexibleNumber(totalMarks);
  const parsedNegativeMarking = parseFlexibleNumber(negativeMarking);

  if (!title?.trim()) {
    throw new Error("Exam title is required");
  }

  if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
    throw new Error("Exam duration must be greater than zero");
  }

  if (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks <= 0) {
    throw new Error("Total marks must be greater than zero");
  }

  if (!Number.isFinite(parsedNegativeMarking) || parsedNegativeMarking < 0) {
    throw new Error("Negative marking must be a valid number like 0.25 or 1/3");
  }

  if (status === "published" && questions.length === 0) {
    throw new Error("Published exams must contain at least one question");
  }

  const normalizedSections = normalizeSections(sections, questions, parsedDuration);
  const seenSectionTitles = new Set();

  normalizedSections.forEach((section) => {
    const lowerTitle = section.title.toLowerCase();

    if (seenSectionTitles.has(lowerTitle)) {
      throw new Error(`Duplicate section title: ${section.title}`);
    }

    if (!Number.isFinite(section.duration) || section.duration < 0) {
      throw new Error(`Section "${section.title}" must have a valid duration`);
    }

    if (!Number.isFinite(section.cutoffMarks) || section.cutoffMarks < 0) {
      throw new Error(`Section "${section.title}" must have a valid cutoff`);
    }

    seenSectionTitles.add(lowerTitle);
  });

  const totalSectionDuration = normalizedSections.reduce((sum, section) => sum + section.duration, 0);
  if (Math.round(totalSectionDuration) !== Math.round(parsedDuration)) {
    throw new Error("The sum of section durations must match the overall exam duration");
  }

  const definedSections = new Set(normalizedSections.map((section) => section.title.toLowerCase()));

  questions.forEach((question, index) => {
    if (!question.prompt?.trim()) {
      throw new Error(`Question ${index + 1}: prompt is required`);
    }

    if (!question.section?.trim()) {
      throw new Error(`Question ${index + 1}: section is required`);
    }

    if (!definedSections.has(question.section.trim().toLowerCase())) {
      throw new Error(`Question ${index + 1}: section "${question.section}" is not defined in section rules`);
    }

    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error(`Question ${index + 1}: at least two options are required`);
    }

    const filledOptions = question.options.filter((option) => option.text?.trim());
    if (filledOptions.length < 2) {
      throw new Error(`Question ${index + 1}: please fill at least two options`);
    }

    if (!Array.isArray(question.correctOptionIds) || question.correctOptionIds.length === 0) {
      throw new Error(`Question ${index + 1}: select at least one correct option`);
    }
  });
};

const normalizeQuestions = (questions = []) =>
  questions.map((question) => {
    const optionIdMap = new Map();
    const normalizedOptions = question.options.map((option, optionIndex) => {
      const normalizedId =
        option._id && mongoose.isValidObjectId(option._id) ? option._id : new mongoose.Types.ObjectId();

      optionIdMap.set(option._id?.toString(), normalizedId);
      optionIdMap.set(optionIndex.toString(), normalizedId);

      return {
        _id: normalizedId,
        text: option.text
      };
    });

    const correctOptionIds = (question.correctOptionIds || [])
      .map((optionId) => optionIdMap.get(optionId?.toString()))
      .filter(Boolean);

    return {
      prompt: question.prompt,
      section: question.section?.trim() || "General",
      type: question.type,
      marks: parseFlexibleNumber(question.marks || 1),
      explanation: question.explanation || "",
      enableSkipOption: question.enableSkipOption !== false,
      options: normalizedOptions,
      correctOptionIds
    };
  });

const buildAttemptMeta = (exam, submittedAttempts, activeAttempt = null) => {
  const maxAttempts = Number(exam.maxAttempts || 0);
  const attemptsUsed = submittedAttempts;
  const attemptsRemaining = maxAttempts === 0 ? null : Math.max(maxAttempts - attemptsUsed, 0);

  return {
    maxAttempts,
    attemptsUsed,
    attemptsRemaining,
    hasUnlimitedAttempts: maxAttempts === 0,
    hasActiveAttempt: Boolean(activeAttempt),
    activeAttemptId: activeAttempt?._id || null,
    activeAttemptStartedAt: activeAttempt?.startedAt || null
  };
};

const getLockState = (exam) => {
  const lockedUntil = exam.lockedUntil ? new Date(exam.lockedUntil) : null;
  const lockedByTime = lockedUntil && lockedUntil.getTime() > Date.now();

  return {
    isLocked: Boolean(exam.isLocked || lockedByTime),
    lockedUntil
  };
};

export const createExam = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    subject,
    topic,
    playlist,
    duration,
    totalMarks,
    negativeMarking,
    startTime,
    endTime,
    status,
    questions,
    sections,
    isLocked,
    lockedUntil
  } = req.body;

  validateSchedule(startTime, endTime);
  validateExamPayload({ title, duration, totalMarks, negativeMarking, questions, status, sections });

  const normalizedQuestions = normalizeQuestions(questions || []);
  const normalizedSections = normalizeSections(sections || [], normalizedQuestions, duration);

  const exam = await Exam.create({
    title,
    description,
    subject,
    topic,
    playlist,
    duration: parseFlexibleNumber(duration),
    totalMarks: normalizedQuestions.length ? getMaximumMarks({ questions: normalizedQuestions }) : parseFlexibleNumber(totalMarks),
    negativeMarking: parseFlexibleNumber(negativeMarking),
    maxAttempts: parseAttemptLimit(req.body.maxAttempts),
    isLocked: Boolean(isLocked),
    lockedUntil: lockedUntil || null,
    startTime,
    endTime,
    status: status || "draft",
    createdBy: req.user._id,
    questions: normalizedQuestions,
    sections: normalizedSections
  });

  res.status(201).json(exam);
});

export const getAdminExams = asyncHandler(async (req, res) => {
  const exams = await Exam.find().populate("createdBy", "name email").sort({ createdAt: -1 }).lean();
  res.json(exams.map((exam) => ({ ...exam, ...getLockState(exam) })));
});

export const getAvailableExams = asyncHandler(async (req, res) => {
  const now = new Date();
  const exams = await Exam.find({
    status: "published",
    startTime: { $lte: now },
    endTime: { $gte: now }
  })
    .select("-questions.correctOptionIds")
    .sort({ startTime: 1 });

  const examIds = exams.map((exam) => exam._id);
  const [submittedResults, activeAttempts] = await Promise.all([
    Result.find({
      user: req.user._id,
      exam: { $in: examIds },
      isSubmitted: true
    })
      .select("exam")
      .lean(),
    Result.find({
      user: req.user._id,
      exam: { $in: examIds },
      isSubmitted: false
    })
      .select("_id exam startedAt")
      .lean()
  ]);

  const submittedAttemptMap = submittedResults.reduce((accumulator, result) => {
    const examId = result.exam.toString();
    accumulator[examId] = (accumulator[examId] || 0) + 1;
    return accumulator;
  }, {});

  const activeAttemptMap = activeAttempts.reduce((accumulator, result) => {
    accumulator[result.exam.toString()] = result;
    return accumulator;
  }, {});

  res.json(
    exams.map((exam) => ({
      ...exam.toObject(),
      ...getLockState(exam),
      ...buildAttemptMeta(exam, submittedAttemptMap[exam._id.toString()] || 0, activeAttemptMap[exam._id.toString()] || null)
    }))
  );
});

export const getExamById = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate("createdBy", "name");

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (req.user.role === "admin") {
    return res.json({ ...exam.toObject(), ...getLockState(exam) });
  }

  const [submittedAttempts, activeAttempt] = await Promise.all([
    Result.countDocuments({
      exam: exam._id,
      user: req.user._id,
      isSubmitted: true
    }),
    Result.findOne({
      exam: exam._id,
      user: req.user._id,
      isSubmitted: false
    }).select("_id startedAt")
  ]);

  return res.json({
    ...sanitizeExamForCandidate(exam),
    ...getLockState(exam),
    ...buildAttemptMeta(exam, submittedAttempts, activeAttempt)
  });
});

export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const payload = req.body;

  if (payload.startTime && payload.endTime) {
    validateSchedule(payload.startTime, payload.endTime);
  }

  validateExamPayload({
    title: payload.title ?? exam.title,
    duration: payload.duration ?? exam.duration,
    totalMarks: payload.totalMarks ?? exam.totalMarks,
    negativeMarking: payload.negativeMarking ?? exam.negativeMarking,
    questions: payload.questions ?? exam.questions,
    status: payload.status ?? exam.status,
    sections: payload.sections ?? exam.sections
  });

  const normalizedQuestions = payload.questions ? normalizeQuestions(payload.questions) : exam.questions;

  Object.assign(exam, {
    ...payload,
    duration: payload.duration !== undefined ? parseFlexibleNumber(payload.duration) : exam.duration,
    totalMarks: payload.questions
      ? getMaximumMarks({ questions: normalizedQuestions })
      : payload.totalMarks !== undefined
        ? parseFlexibleNumber(payload.totalMarks)
        : exam.totalMarks,
    negativeMarking:
      payload.negativeMarking !== undefined
        ? parseFlexibleNumber(payload.negativeMarking)
        : exam.negativeMarking,
    maxAttempts: payload.maxAttempts !== undefined ? parseAttemptLimit(payload.maxAttempts) : exam.maxAttempts,
    isLocked: payload.isLocked !== undefined ? Boolean(payload.isLocked) : exam.isLocked,
    lockedUntil: payload.lockedUntil !== undefined ? payload.lockedUntil || null : exam.lockedUntil,
    questions: normalizedQuestions,
    sections:
      payload.sections !== undefined || payload.questions
        ? normalizeSections(payload.sections ?? exam.sections, normalizedQuestions, payload.duration ?? exam.duration)
        : exam.sections
  });

  await exam.save();
  res.json(exam);
});

export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  await Result.deleteMany({ exam: exam._id });
  await exam.deleteOne();

  res.json({ message: "Exam deleted successfully" });
});

export const addQuestionsToExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  exam.questions = normalizeQuestions(req.body.questions || []);
  exam.sections = normalizeSections(exam.sections, exam.questions, exam.duration);
  await exam.save();

  res.json(exam);
});

export const startExamAttempt = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const now = new Date();
  const lockState = getLockState(exam);

  if (exam.status !== "published" || now < exam.startTime || now > exam.endTime) {
    res.status(400);
    throw new Error("Exam is not active right now");
  }

  if (lockState.isLocked) {
    return res.status(423).json({
      message: lockState.lockedUntil
        ? `This exam is locked until ${lockState.lockedUntil.toLocaleString()}.`
        : "This exam is currently locked by the admin.",
      isLocked: true,
      lockedUntil: lockState.lockedUntil
    });
  }

  const [submittedAttempts, activeAttempt] = await Promise.all([
    Result.countDocuments({ exam: exam._id, user: req.user._id, isSubmitted: true }),
    Result.findOne({ exam: exam._id, user: req.user._id, isSubmitted: false }).sort({ createdAt: -1 })
  ]);

  let result = activeAttempt;

  if (!result && exam.maxAttempts > 0 && submittedAttempts >= exam.maxAttempts) {
    return res.status(409).json({
      message: `Attempt limit reached. You can take this exam ${exam.maxAttempts} time(s).`,
      attemptLimitReached: true
    });
  }

  if (!result) {
    const orderedQuestions = [...exam.questions];

    if (exam.shuffleQuestions) {
      orderedQuestions.sort(() => Math.random() - 0.5);
    }

    result = await Result.create({
      exam: exam._id,
      user: req.user._id,
      attemptNumber: submittedAttempts + 1,
      answers: orderedQuestions.map((question) => ({
        questionId: question._id,
        selectedOptionIds: [],
        isSkipped: false,
        visited: false
      })),
      startedAt: now
    });
  }

  res.json({
    exam: {
      ...sanitizeExamForCandidate(exam, result.answers.map((answer) => answer.questionId)),
      ...lockState,
      ...buildAttemptMeta(exam, submittedAttempts, activeAttempt)
    },
    resultId: result._id,
    attemptNumber: result.attemptNumber,
    tabSwitchCount: result.tabSwitchCount,
    startedAt: result.startedAt,
    isResumedAttempt: Boolean(activeAttempt),
    answers: result.answers
  });
});

export const saveAnswer = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const {
    questionId,
    selectedOptionIds = [],
    visited = true,
    markedForReview = false,
    tabSwitched = false,
    fullscreenEntered = false,
    fullscreenExited = false,
    isSkipped = false
  } = req.body;

  const result = await Result.findOne({ _id: resultId, user: req.user._id });

  if (!result) {
    res.status(404);
    throw new Error("Attempt not found");
  }

  if (result.isSubmitted) {
    res.status(400);
    throw new Error("Exam already submitted");
  }

  const exam = await Exam.findById(result.exam).select("questions");

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const answer = result.answers.find((item) => item.questionId.toString() === questionId);

  if (!answer) {
    res.status(404);
    throw new Error("Question answer entry not found");
  }

  const question = exam.questions.find((item) => item._id.toString() === questionId);

  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }

  const allowedOptionIds = new Set(question.options.map((option) => option._id.toString()));
  const normalizedSelections = [...new Set(selectedOptionIds.map((id) => id.toString()))].filter((id) =>
    allowedOptionIds.has(id)
  );

  answer.selectedOptionIds = isSkipped ? [] : normalizedSelections;
  answer.visited = visited;
  answer.isSkipped = Boolean(isSkipped);
  answer.markedForReview = markedForReview;

  if (tabSwitched) {
    result.tabSwitchCount += 1;
  }

  if (fullscreenEntered) {
    result.fullscreenEnterCount += 1;
  }

  if (fullscreenExited) {
    result.fullscreenExitCount += 1;
  }

  await result.save();

  res.json({
    message: "Answer saved",
    answers: result.answers,
    tabSwitchCount: result.tabSwitchCount,
    fullscreenEnterCount: result.fullscreenEnterCount,
    fullscreenExitCount: result.fullscreenExitCount
  });
});

export const submitExam = asyncHandler(async (req, res) => {
  const { resultId } = req.params;
  const result = await Result.findOne({ _id: resultId, user: req.user._id });

  if (!result) {
    res.status(404);
    throw new Error("Attempt not found");
  }

  const exam = await Exam.findById(result.exam);

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  const stats = calculateResultStats(exam, result.answers);

  result.answers = stats.evaluatedAnswers;
  result.score = stats.score;
  result.correctCount = stats.correctCount;
  result.incorrectCount = stats.incorrectCount;
  result.unansweredCount = stats.unansweredCount;
  result.percentage = stats.percentage;
  result.sectionScores = stats.sectionScores;
  result.submittedAt = new Date();
  result.isSubmitted = true;

  await result.save();

  res.json(result);
});

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const [totalUsers, totalExams, totalResults, recentExams] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Exam.countDocuments(),
    Result.countDocuments({ isSubmitted: true }),
    Exam.find().sort({ createdAt: -1 }).limit(5).lean()
  ]);

  res.json({
    totalUsers,
    totalExams,
    totalResults,
    recentExams
  });
});

export const getResultsForExam = asyncHandler(async (req, res) => {
  const results = await Result.find({ exam: req.params.id, isSubmitted: true })
    .populate("user", "name email")
    .sort({ submittedAt: -1 });

  res.json(results);
});

export const importQuestions = asyncHandler(async (req, res) => {
  let sourceText = req.body.text?.trim() || "";

  if (req.file) {
    const lowerName = req.file.originalname.toLowerCase();

    if (lowerName.endsWith(".docx")) {
      const extracted = await mammoth.extractRawText({ buffer: req.file.buffer });
      sourceText = extracted.value;
    } else {
      sourceText = req.file.buffer.toString("utf-8");
    }
  }

  const questions = parseImportedQuestions(sourceText).map((question) => ({
    ...question,
    section: question.section || "General",
    enableSkipOption: question.enableSkipOption !== false
  }));
  res.json({ questions });
});
