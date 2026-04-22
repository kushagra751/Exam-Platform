import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const getMyResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ user: req.user._id, isSubmitted: true })
    .populate("exam", "title duration totalMarks negativeMarking maxAttempts")
    .sort({ submittedAt: -1 })
    .lean();

  res.json(results);
});

export const getResultById = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id)
    .populate("exam")
    .populate("user", "name email");

  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  if (req.user.role !== "admin" && result.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You are not allowed to view this result");
  }

  const exam = await Exam.findById(result.exam._id);

  const detailedAnswers = exam.questions.map((question) => {
    const savedAnswer = result.answers.find(
      (answer) => answer.questionId.toString() === question._id.toString()
    );

    return {
      questionId: question._id,
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      explanation: question.explanation,
      options: question.options,
      correctOptionIds: question.correctOptionIds,
      selectedOptionIds: savedAnswer?.selectedOptionIds || [],
      isCorrect: savedAnswer?.isCorrect || false,
      obtainedMarks: savedAnswer?.obtainedMarks || 0
    };
  });

  res.json({
    ...result.toObject(),
    detailedAnswers
  });
});

export const getAllResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ isSubmitted: true })
    .populate("exam", "title")
    .populate("user", "name email")
    .sort({ submittedAt: -1 })
    .lean();

  res.json(results);
});
