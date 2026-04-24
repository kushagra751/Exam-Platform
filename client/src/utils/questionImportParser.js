const createOptionId = () =>
  globalThis.crypto?.randomUUID?.() || `opt-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeLine = (line) => line.replace(/\r/g, "").trim();

const splitBlocks = (text) =>
  text
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

const parseAnswerTokens = (value) =>
  value
    .split(/[,\s]+/)
    .map((token) => token.trim().replace(/\.$/, "").toUpperCase())
    .filter(Boolean);

export const parseImportedQuestionsClient = (rawText) => {
  const text = rawText?.replace(/\u0000/g, "").trim();

  if (!text) {
    throw new Error("No question content found. Paste text or upload a file with questions.");
  }

  const blocks = splitBlocks(text);

  if (blocks.length === 0) {
    throw new Error("No questions detected. Use blank lines to separate questions.");
  }

  return blocks.map((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map(normalizeLine)
      .filter(Boolean);

    let prompt = "";
    let explanation = "";
    let marks = 1;
    let type = "single";
    const options = [];
    const answerTokens = [];

    lines.forEach((line) => {
      if (/^(q|question)\s*:/i.test(line)) {
        prompt = line.replace(/^(q|question)\s*:\s*/i, "").trim();
        return;
      }

      if (/^answer\s*:/i.test(line)) {
        answerTokens.push(...parseAnswerTokens(line.replace(/^answer\s*:\s*/i, "")));
        return;
      }

      if (/^explanation\s*:/i.test(line)) {
        explanation = line.replace(/^explanation\s*:\s*/i, "").trim();
        return;
      }

      if (/^marks\s*:/i.test(line)) {
        const parsed = Number(line.replace(/^marks\s*:\s*/i, "").trim());
        marks = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
        return;
      }

      if (/^type\s*:/i.test(line)) {
        const parsedType = line.replace(/^type\s*:\s*/i, "").trim().toLowerCase();
        type = parsedType === "multiple" ? "multiple" : "single";
        return;
      }

      const optionMatch = line.match(/^([A-H])[\).\:-]\s*(.+)$/i);
      if (optionMatch) {
        options.push({
          label: optionMatch[1].toUpperCase(),
          _id: createOptionId(),
          text: optionMatch[2].trim()
        });
        return;
      }

      if (!prompt) {
        prompt = line;
      }
    });

    if (!prompt) {
      throw new Error(`Question ${blockIndex + 1}: prompt is missing.`);
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
  });
};
