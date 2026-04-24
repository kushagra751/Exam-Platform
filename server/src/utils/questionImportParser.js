import mongoose from "mongoose";

const createOptionId = () => new mongoose.Types.ObjectId().toString();

const normalizeLine = (line) => line.replace(/\r/g, "").trim();

const questionPrefixPattern = /^(?:(?:q|question)\s*\d*\s*[:.)-]\s*|\d+\s*[.)-]\s*)/i;
const optionPattern = /^([A-H])[\).\:-]\s*(.+)$/i;
const answerPattern = /^(?:answer|ans|correct answer)\s*:/i;
const explanationPattern = /^explanation\s*:/i;
const marksPattern = /^marks\s*:/i;
const typePattern = /^type\s*:/i;

const parseAnswerTokens = (value) =>
  value
    .split(/[,\s]+/)
    .map((token) => token.trim().replace(/\.$/, "").toUpperCase())
    .filter(Boolean);

const splitBlocks = (text) =>
  text
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

const isQuestionStart = (line) => questionPrefixPattern.test(line);

const toQuestionBlocks = (text) => {
  const lines = text.split("\n").map(normalizeLine);
  const blocks = [];
  let current = [];
  let foundExplicitQuestionStart = false;

  lines.forEach((line) => {
    if (!line) {
      return;
    }

    if (isQuestionStart(line)) {
      foundExplicitQuestionStart = true;

      if (current.length) {
        blocks.push(current);
      }

      current = [line];
      return;
    }

    current.push(line);
  });

  if (current.length) {
    blocks.push(current);
  }

  if (foundExplicitQuestionStart) {
    return blocks.filter((block) => block.length);
  }

  return splitBlocks(text).map((block) => block.split("\n").map(normalizeLine).filter(Boolean));
};

const parseQuestionBlock = (lines, blockIndex) => {
  const promptLines = [];
  const explanationLines = [];
  let marks = 1;
  let type = "single";
  let explanationStarted = false;
  let answerSeen = false;
  const options = [];
  const answerTokens = [];

  lines.forEach((line) => {
    if (!line) {
      return;
    }

    if (isQuestionStart(line)) {
      const promptText = line.replace(questionPrefixPattern, "").trim();
      if (promptText) {
        promptLines.push(promptText);
      }
      explanationStarted = false;
      return;
    }

    if (answerPattern.test(line)) {
      answerTokens.push(...parseAnswerTokens(line.replace(answerPattern, "")));
      explanationStarted = false;
      answerSeen = true;
      return;
    }

    if (explanationPattern.test(line)) {
      const explanationText = line.replace(explanationPattern, "").trim();
      if (explanationText) {
        explanationLines.push(explanationText);
      }
      explanationStarted = true;
      return;
    }

    if (marksPattern.test(line)) {
      const parsed = Number(line.replace(marksPattern, "").trim());
      marks = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
      explanationStarted = false;
      return;
    }

    if (typePattern.test(line)) {
      const parsedType = line.replace(typePattern, "").trim().toLowerCase();
      type = parsedType === "multiple" ? "multiple" : "single";
      explanationStarted = false;
      return;
    }

    const optionMatch = line.match(optionPattern);
    if (optionMatch) {
      options.push({
        label: optionMatch[1].toUpperCase(),
        _id: createOptionId(),
        text: optionMatch[2].trim()
      });
      explanationStarted = false;
      return;
    }

    if (explanationStarted) {
      explanationLines.push(line);
      return;
    }

    if (options.length > 0 && !answerSeen) {
      const lastOption = options[options.length - 1];
      lastOption.text = `${lastOption.text} ${line}`.trim();
      return;
    }

    promptLines.push(line);
  });

  const prompt = promptLines.join(" ").trim();
  const explanation = explanationLines.join(" ").trim();

  if (!prompt) {
    throw new Error(`Question ${blockIndex + 1}: prompt is missing. Start each question with text like "Q:" or "1."`);
  }

  if (options.length < 2) {
    throw new Error(`Question ${blockIndex + 1}: at least two options are required.`);
  }

  if (answerTokens.length === 0) {
    throw new Error(`Question ${blockIndex + 1}: Answer line is missing.`);
  }

  const correctOptionIds = answerTokens
    .map((token) => options.find((option) => option.label === token)?._id)
    .filter(Boolean);

  if (correctOptionIds.length === 0) {
    throw new Error(`Question ${blockIndex + 1}: Answer does not match any option labels.`);
  }

  const dedupedCorrectOptionIds = [...new Set(correctOptionIds)];

  return {
    prompt,
    type: dedupedCorrectOptionIds.length > 1 ? "multiple" : type,
    marks,
    explanation,
    options: options.map(({ _id, text: optionText }) => ({
      _id,
      text: optionText
    })),
    correctOptionIds: dedupedCorrectOptionIds
  };
};

export const importTemplate = `Q: What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B
Explanation: Basic addition
Marks: 1
Type: single

2. Which are prime numbers?
A. 2
B. 4
C. 5
D. 9
Ans: A,C
Type: multiple`;

export const parseImportedQuestions = (rawText) => {
  const text = rawText?.replace(/\u0000/g, "").trim();

  if (!text) {
    throw new Error("No question content found. Paste text or upload a file with questions.");
  }

  const blocks = toQuestionBlocks(text);

  if (blocks.length === 0) {
    throw new Error("No questions detected. Use blank lines or numbered question labels to separate questions.");
  }

  return blocks.map((block, blockIndex) => parseQuestionBlock(block, blockIndex));
};
