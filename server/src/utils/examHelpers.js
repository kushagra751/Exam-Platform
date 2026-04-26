export const normalizeObjectIds = (ids = []) =>
  ids.map((id) => id.toString()).sort();

export const getExamSections = (exam) => {
  const examObject = exam.toObject ? exam.toObject() : exam;
  const fallbackDuration = Number(examObject.duration || 0);

  return [
    {
      title: "General",
      duration: fallbackDuration,
      cutoffMarks: 0
    }
  ];
};

export const getMaximumMarks = (exam) => {
  const questions = exam.questions || [];
  const marksFromQuestions = questions.reduce((total, question) => total + Number(question.marks || 0), 0);

  return marksFromQuestions > 0 ? Number(marksFromQuestions.toFixed(2)) : Number(exam.totalMarks || 0);
};

export const sanitizeExamForCandidate = (exam, questionOrder = [], optionOrderMap = {}) => {
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
    examKind: examObject.examKind,
    language: examObject.language,
    currentAffairsCategory: examObject.currentAffairsCategory,
    stateName: examObject.stateName,
    duration: examObject.duration,
    totalMarks: examObject.totalMarks,
    maxAttempts: examObject.maxAttempts,
    maxSkips: examObject.maxSkips,
    negativeMarking: examObject.negativeMarking,
    startTime: examObject.startTime,
    endTime: examObject.endTime,
    isLocked: examObject.isLocked,
    lockedUntil: examObject.lockedUntil,
    sortOrder: examObject.sortOrder,
    questions: orderedQuestions.map((question) => ({
      _id: question._id,
      prompt: question.prompt,
      type: question.type,
      marks: question.marks,
      eventDate: question.eventDate,
      currentAffairCategory: question.currentAffairCategory,
      options: (
        (optionOrderMap[question._id.toString()]?.length
          ? optionOrderMap[question._id.toString()]
              .map((id) => question.options.find((option) => option._id.toString() === id.toString()))
              .filter(Boolean)
          : question.options)
      ).map((option) => ({
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
    if (skipped || !answered) {
      unansweredCount += 1;
    } else if (isCorrect) {
      correctCount += 1;
      obtainedMarks = question.marks;
      score += question.marks;
    } else {
      incorrectCount += 1;
      obtainedMarks = -exam.negativeMarking;
      score -= exam.negativeMarking;
    }

    return {
      questionId: question._id,
      selectedOptionIds: existingAnswer?.selectedOptionIds || [],
      visited: existingAnswer?.visited || false,
      isSkipped: skipped,
      markedForReview: existingAnswer?.markedForReview || false,
      timeSpentSeconds: existingAnswer?.timeSpentSeconds || 0,
      isCorrect,
      obtainedMarks
    };
  });

  const rawPercentage = maximumMarks > 0 ? (score / maximumMarks) * 100 : 0;
  const percentage = Number(Math.min(100, Math.max(0, rawPercentage)).toFixed(2));

  return {
    evaluatedAnswers,
    score: Number(score.toFixed(2)),
    correctCount,
    incorrectCount,
    unansweredCount,
    maximumMarks,
    percentage
  };
};
