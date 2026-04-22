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
    },
    section: {
      type: String,
      default: "General",
      trim: true
    },
    enableSkipOption: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: Number,
      default: 0,
      min: 0
    },
    cutoffMarks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
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
    subject: {
      type: String,
      default: "",
      trim: true
    },
    topic: {
      type: String,
      default: "",
      trim: true
    },
    playlist: {
      type: String,
      default: "",
      trim: true
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
    isLocked: {
      type: Boolean,
      default: false
    },
    lockedUntil: {
      type: Date,
      default: null
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
    },
    sections: {
      type: [sectionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
