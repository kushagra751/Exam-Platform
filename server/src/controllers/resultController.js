import Result from "../models/Result.js";
import Exam from "../models/Exam.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const buildResultAnalyzer = (result, exam, detailedAnswers) => {
  const totalQuestions = detailedAnswers.length;
  const answeredCount = result.correctCount + result.incorrectCount;
  const attemptedRate = totalQuestions ? Number(((answeredCount / totalQuestions) * 100).toFixed(2)) : 0;
  const accuracy = answeredCount ? Number(((result.correctCount / answeredCount) * 100).toFixed(2)) : 0;
  const skipRate = totalQuestions ? Number(((result.unansweredCount / totalQuestions) * 100).toFixed(2)) : 0;
  const scoreEfficiency = exam.totalMarks ? Number(((result.score / exam.totalMarks) * 100).toFixed(2)) : 0;
  const durationMinutes = Math.max(
    0,
    Number((((new Date(result.submittedAt || result.updatedAt)).getTime() - new Date(result.startedAt).getTime()) / 60000).toFixed(2))
  );
  const avgSecondsPerQuestion = totalQuestions ? Number(((durationMinutes * 60) / totalQuestions).toFixed(2)) : 0;
  const totalTrackedSeconds = detailedAnswers.reduce((sum, answer) => sum + Number(answer.timeSpentSeconds || 0), 0);
  const slowestQuestions = [...detailedAnswers]
    .map((answer, index) => ({
      questionNumber: index + 1,
      timeSpentSeconds: Number(answer.timeSpentSeconds || 0),
      status: answer.isSkipped ? "Skipped" : answer.isCorrect ? "Correct" : answer.selectedOptionIds.length ? "Incorrect" : "Not attempted"
    }))
    .sort((left, right) => right.timeSpentSeconds - left.timeSpentSeconds)
    .slice(0, 5);
  const fastestQuestions = [...detailedAnswers]
    .map((answer, index) => ({
      questionNumber: index + 1,
      timeSpentSeconds: Number(answer.timeSpentSeconds || 0),
      status: answer.isSkipped ? "Skipped" : answer.isCorrect ? "Correct" : answer.selectedOptionIds.length ? "Incorrect" : "Not attempted"
    }))
    .filter((item) => item.timeSpentSeconds > 0)
    .sort((left, right) => left.timeSpentSeconds - right.timeSpentSeconds)
    .slice(0, 5);

  const reviewQuestionNumbers = detailedAnswers
    .map((answer, index) => ({ index, answer }))
    .filter(({ answer }) => !answer.isSkipped && !answer.isCorrect && answer.selectedOptionIds.length > 0)
    .slice(0, 5)
    .map(({ index, answer }) => ({
      questionNumber: index + 1,
      marksImpact: answer.obtainedMarks,
      timeSpentSeconds: Number(answer.timeSpentSeconds || 0)
    }));

  const recommendations = [];

  if (accuracy < 60) {
    recommendations.push("Accuracy is low right now. Slow down on uncertain questions and reduce risky guesses.");
  }

  if (skipRate > 25) {
    recommendations.push("A high number of questions were skipped or left unanswered. Try a first-pass strategy for easier marks.");
  }

  if (result.tabSwitchCount > 0 || result.fullscreenExitCount > 0) {
    recommendations.push("Focus discipline dropped during the exam. Stay on one screen to avoid interruptions and lost momentum.");
  }

  if (avgSecondsPerQuestion > 90) {
    recommendations.push("Average time per question is high. Practice a tighter first pass so difficult questions do not consume too much time.");
  }

  if (!recommendations.length) {
    recommendations.push("This was a steady attempt. Focus next on improving accuracy and speed together for a higher final score.");
  }

  return {
    totalQuestions,
    attemptedRate,
    accuracy,
    skipRate,
    scoreEfficiency,
    durationMinutes,
    avgSecondsPerQuestion,
    totalTrackedSeconds,
    slowestQuestions,
    fastestQuestions,
    reviewQuestionNumbers,
    recommendations
  };
};

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
      isSkipped: savedAnswer?.isSkipped || false,
      isCorrect: savedAnswer?.isCorrect || false,
      obtainedMarks: savedAnswer?.obtainedMarks || 0,
      timeSpentSeconds: savedAnswer?.timeSpentSeconds || 0
    };
  });

  res.json({
    ...result.toObject(),
    detailedAnswers,
    analyzer: buildResultAnalyzer(result, exam, detailedAnswers)
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
