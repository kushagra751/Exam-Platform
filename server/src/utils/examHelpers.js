export const normalizeObjectIds = (ids = []) =>
  ids.map((id) => id.toString()).sort();

export const getExamSections = (exam) => {
  const examObject = exam.toObject ? exam.toObject() : exam;

  if (Array.isArray(examObject.sections) && examObject.sections.length > 0) {
    return examObject.sections.map((section) => ({
      title: section.title,
      duration: Number(section.duration || 0),
      cutoffMarks: Number(section.cutoffMarks || 0)
    }));
  }

  const uniqueTitles = [...new Set((examObject.questions || []).map((question) => question.section || "General"))];
  const fallbackDuration = Number(examObject.duration || 0);

  return uniqueTitles.map((title, index) => ({
    title,
    duration: index === 0 ? fallbackDuration : 0,
    cutoffMarks: 0
  }));
};

export const getMaximumMarks = (exam) => {
  const questions = exam.questions || [];
  const marksFromQuestions = questions.reduce((total, question) => total + Number(question.marks || 0), 0);

  return marksFromQuestions > 0 ? Number(marksFromQuestions.toFixed(2)) : Number(exam.totalMarks || 0);
};

export const sanitizeExamForCandidate = (exam, questionOrder = []) => {
  const examObject = exam.toObject ? exam.toObject() : exam;
  const orderedQuestions = questionOrder.length
    ? questionOrder
        .map((id) => examObject.questions.find((question) => question._id.toString() === id.toString()))
        .filter(Boolean)
    : examObject.questions;

  return {
    _id: examObject._id,
    title: examObject.title,
    description: examObject.description,
    subject: examObject.subject,
    topic: examObject.topic,
    playlist: examObject.playlist,
    duration: examObject.duration,
    totalMarks: examObject.totalMarks,
    maxAttempts: examObject.maxAttempts,
    negativeMarking: examObject.negativeMarking,
    startTime: examObject.startTime,
    endTime: examObject.endTime,
    isLocked: examObject.isLocked,
    lockedUntil: examObject.lockedUntil,
    sections: getExamSections(examObject),
    questions: orderedQuestions.map((question) => ({
      _id: question._id,
      prompt: question.prompt,
      section: question.section || "General",
      type: question.type,
      marks: question.marks,
      enableSkipOption: question.enableSkipOption !== false,
      options: question.options.map((option) => ({
        _id: option._id,
        text: option.text
      }))
    }))
  };
};

export const calculateResultStats = (exam, answers) => {
  let score = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const maximumMarks = getMaximumMarks(exam);
  const sections = getExamSections(exam);
  const sectionStatsMap = new Map(
    sections.map((section) => [
      section.title,
      {
        title: section.title,
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: Number(section.cutoffMarks || 0),
        passedCutoff: true
      }
    ])
  );

  const evaluatedAnswers = exam.questions.map((question) => {
    const existingAnswer = answers.find(
      (answer) => answer.questionId.toString() === question._id.toString()
    );

    const selected = normalizeObjectIds(existingAnswer?.selectedOptionIds || []);
    const correct = normalizeObjectIds(question.correctOptionIds || []);
    const skipped = Boolean(existingAnswer?.isSkipped);
    const answered = !skipped && selected.length > 0;
    const isCorrect = answered && JSON.stringify(selected) === JSON.stringify(correct);

    let obtainedMarks = 0;
    const sectionTitle = question.section || "General";

    if (!sectionStatsMap.has(sectionTitle)) {
      sectionStatsMap.set(sectionTitle, {
        title: sectionTitle,
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 0,
        passedCutoff: true
      });
    }

    const sectionStats = sectionStatsMap.get(sectionTitle);

    if (skipped || !answered) {
      unansweredCount += 1;
      sectionStats.unansweredCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      sectionStats.correctCount += 1;
      obtainedMarks = question.marks;
      score += question.marks;
      sectionStats.score += question.marks;
    } else {
      incorrectCount += 1;
      sectionStats.incorrectCount += 1;
      obtainedMarks = -exam.negativeMarking;
      score -= exam.negativeMarking;
      sectionStats.score -= exam.negativeMarking;
    }

    return {
      questionId: question._id,
      selectedOptionIds: existingAnswer?.selectedOptionIds || [],
      visited: existingAnswer?.visited || false,
      isSkipped: skipped,
      markedForReview: existingAnswer?.markedForReview || false,
      isCorrect,
      obtainedMarks
    };
  });

  const rawPercentage = maximumMarks > 0 ? (score / maximumMarks) * 100 : 0;
  const percentage = Number(Math.min(100, Math.max(0, rawPercentage)).toFixed(2));
  const sectionScores = [...sectionStatsMap.values()].map((section) => ({
    ...section,
    score: Number(section.score.toFixed(2)),
    passedCutoff: section.score >= section.cutoffMarks
  }));

  return {
    evaluatedAnswers,
    score: Number(score.toFixed(2)),
    correctCount,
    incorrectCount,
    unansweredCount,
    maximumMarks,
    percentage,
    sectionScores
  };
};
