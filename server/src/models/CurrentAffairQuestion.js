import mongoose from "mongoose";

const currentAffairOptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const currentAffairQuestionSchema = new mongoose.Schema(
  {
    cacheDateKey: {
      type: String,
      required: true,
      trim: true
    },
    sourceHash: {
      type: String,
      required: true,
      trim: true
    },
    language: {
      type: String,
      enum: ["hindi", "english"],
      required: true
    },
    category: {
      type: String,
      enum: ["state", "india"],
      required: true
    },
    stateName: {
      type: String,
      default: "",
      trim: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: {
      type: [currentAffairOptionSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 4,
        message: "Current affairs questions must have exactly four options"
      }
    },
    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    explanation: {
      type: String,
      default: "",
      trim: true
    },
    eventDate: {
      type: Date,
      default: null
    },
    sourceTitle: {
      type: String,
      default: "",
      trim: true
    },
    sourceUrl: {
      type: String,
      default: "",
      trim: true
    },
    sourceProvider: {
      type: String,
      default: "",
      trim: true
    },
    difficulty: {
      type: String,
      default: "medium",
      trim: true
    },
    sourceSummary: {
      type: String,
      default: "",
      trim: true
    },
    tags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

currentAffairQuestionSchema.index(
  { cacheDateKey: 1, sourceHash: 1, language: 1, category: 1, stateName: 1 },
  { unique: true }
);
currentAffairQuestionSchema.index({ language: 1, category: 1, stateName: 1, createdAt: -1 });

const CurrentAffairQuestion = mongoose.model("CurrentAffairQuestion", currentAffairQuestionSchema);

export default CurrentAffairQuestion;
