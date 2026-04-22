import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: true }
);

const questionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["single", "multiple"],
      default: "single"
    },
    marks: {
      type: Number,
      default: 1,
      min: 0
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 2,
        message: "At least two options are required"
      }
    },
    correctOptionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 1,
        message: "At least one correct option must be selected"
      }
    },
    explanation: {
      type: String,
      default: ""
    }
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1
    },
    negativeMarking: {
      type: Number,
      default: 0,
      min: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 0
    },
    status: {
      type: String,
      enum: ["draft", "published", "completed"],
      default: "draft"
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    shuffleQuestions: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    questions: {
      type: [questionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
