import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOptionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    optionOrderIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    obtainedMarks: {
      type: Number,
      default: 0
    },
    visited: {
      type: Boolean,
      default: false
    },
    isSkipped: {
      type: Boolean,
      default: false
    },
    markedForReview: {
      type: Boolean,
      default: false
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1
    },
    answers: {
      type: [answerSchema],
      default: []
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: {
      type: Date
    },
    score: {
      type: Number,
      default: 0
    },
    correctCount: {
      type: Number,
      default: 0
    },
    incorrectCount: {
      type: Number,
      default: 0
    },
    unansweredCount: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    isSubmitted: {
      type: Boolean,
      default: false
    },
    tabSwitchCount: {
      type: Number,
      default: 0
    },
    fullscreenEnterCount: {
      type: Number,
      default: 0
    },
    fullscreenExitCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

resultSchema.index({ exam: 1, user: 1, attemptNumber: 1 }, { unique: true });

const Result = mongoose.model("Result", resultSchema);

export default Result;
