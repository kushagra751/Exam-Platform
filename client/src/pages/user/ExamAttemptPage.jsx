import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { ExamPalette } from "../../components/ExamPalette";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import {
  exitDocumentFullscreen,
  getFullscreenElement,
  isFullscreenSupported,
  requestDocumentFullscreen
} from "../../utils/fullscreen";
import { formatCountdown, getTimeRemainingInSeconds } from "../../utils/format";

const getOptionLabel = (index) => String.fromCharCode(65 + index);

const getElapsedSeconds = (startedAt) => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));

const getSectionTiming = (sections = [], startedAt) => {
  const elapsed = getElapsedSeconds(startedAt);
  let consumed = 0;

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const sectionDurationSeconds = Number(section.duration || 0) * 60;
    const sectionEnd = consumed + sectionDurationSeconds;

    if (elapsed < sectionEnd || index === sections.length - 1) {
      return {
        activeSectionIndex: index,
        elapsed,
        sectionRemainingSeconds: Math.max(0, sectionEnd - elapsed)
      };
    }

    consumed = sectionEnd;
  }

  return {
    activeSectionIndex: 0,
    elapsed,
    sectionRemainingSeconds: 0
  };
};

export const ExamAttemptPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const fullscreenSupported = isFullscreenSupported();
  const saveTimerRef = useRef(null);
  const answersRef = useRef([]);
  const attemptRef = useRef(null);
  const currentIndexRef = useRef(0);
  const submittingRef = useRef(false);
  const wasFullscreenRef = useRef(false);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [tabWarning, setTabWarning] = useState("");
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenEnterCount, setFullscreenEnterCount] = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [fullscreenWarning, setFullscreenWarning] = useState("");
  const [needsFullscreen, setNeedsFullscreen] = useState(false);

  const syncAttemptCounters = (data) => {
    setTabSwitchCount(data.tabSwitchCount || 0);
    setFullscreenEnterCount(data.fullscreenEnterCount || 0);
    setFullscreenExitCount(data.fullscreenExitCount || 0);
  };

  const persistAnswer = async (
    questionId,
    { tabSwitched = false, fullscreenEntered = false, fullscreenExited = false } = {}
  ) => {
    const currentAttempt = attemptRef.current;
    const answer = answersRef.current.find((item) => item.questionId === questionId);

    if (!currentAttempt || !answer) {
      return null;
    }

    const response = await api.put(`/exams/attempts/${currentAttempt.resultId}/answer`, {
      questionId,
      selectedOptionIds: answer.selectedOptionIds,
      visited: true,
      isSkipped: answer.isSkipped,
      markedForReview: answer.markedForReview,
      tabSwitched,
      fullscreenEntered,
      fullscreenExited
    });

    syncAttemptCounters(response.data);
    return response.data;
  };

  const requestFullscreen = async () => {
    if (!fullscreenSupported) {
      setNeedsFullscreen(false);
      return;
    }

    try {
      if (!getFullscreenElement()) {
        await requestDocumentFullscreen();
      }

      if (!wasFullscreenRef.current) {
        const questionId = attemptRef.current?.exam?.questions?.[currentIndexRef.current]?._id;
        wasFullscreenRef.current = true;

        if (questionId) {
          persistAnswer(questionId, { fullscreenEntered: true }).catch(() => setSaveState("error"));
        }
      }

      setNeedsFullscreen(false);
      setFullscreenWarning("");
    } catch (fullscreenError) {
      setNeedsFullscreen(true);
      setFullscreenWarning("Fullscreen could not start automatically. Tap below to continue.");
    }
  };

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const { data } = await api.post(`/exams/${examId}/start`);
        const mappedAnswers = data.answers.map((answer) => ({
          ...answer,
          questionId: answer.questionId.toString(),
          selectedOptionIds: answer.selectedOptionIds.map((id) => id.toString()),
          isSkipped: Boolean(answer.isSkipped)
        }));

        attemptRef.current = data;
        answersRef.current = mappedAnswers;
        setAttempt(data);
        setAnswers(mappedAnswers);
        syncAttemptCounters(data);
        setRemainingTime(getTimeRemainingInSeconds(data.startedAt, data.exam.duration));

        if (fullscreenSupported) {
          await requestFullscreen();
        }
      } catch (requestError) {
        if (requestError.response?.data?.alreadySubmitted && requestError.response?.data?.resultId) {
          navigate(`/results/${requestError.response.data.resultId}`, { replace: true });
          return;
        }

        setError(requestError.response?.data?.message || "Unable to start exam");
      } finally {
        setLoading(false);
      }
    };

    loadAttempt();
  }, [examId, navigate]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!attempt) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRemainingTime(getTimeRemainingInSeconds(attempt.startedAt, attempt.exam.duration));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [attempt]);

  useEffect(() => {
    if (!attempt || remainingTime > 0 || submitting) {
      return;
    }

    submitExam();
  }, [attempt, remainingTime, submitting]);

  useEffect(() => {
    if (!fullscreenSupported) {
      return undefined;
    }

    const onVisibilityChange = async () => {
      if (!document.hidden || !attemptRef.current || submittingRef.current) {
        return;
      }

      const activeQuestionId = attemptRef.current.exam.questions[currentIndexRef.current]?._id;

      setTabWarning("Tab switching detected. Return to the exam to continue.");
      setNeedsFullscreen(true);
      setFullscreenWarning("You left the exam screen. Re-enter fullscreen before continuing.");

      if (getFullscreenElement()) {
        await exitDocumentFullscreen().catch(() => undefined);
      }

      if (activeQuestionId) {
        setSaveState("saving");
        await persistAnswer(activeQuestionId, { tabSwitched: true }).catch(() => setSaveState("error"));
        setSaveState("saved");
      }
    };

    const onFullscreenChange = () => {
      const active = Boolean(getFullscreenElement());
      setNeedsFullscreen(!active);

      if (active) {
        setFullscreenWarning("");
        return;
      }

      if (attemptRef.current && !submittingRef.current && wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        setFullscreenWarning("Fullscreen exited. Tap below to return to secure mode.");

        const activeQuestionId = attemptRef.current.exam.questions[currentIndexRef.current]?._id;
        if (activeQuestionId) {
          persistAnswer(activeQuestionId, { fullscreenExited: true }).catch(() => setSaveState("error"));
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [fullscreenSupported]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const sections = useMemo(() => attempt?.exam.sections || [], [attempt]);
  const sectionTiming = useMemo(
    () => (attempt ? getSectionTiming(sections, attempt.startedAt) : { activeSectionIndex: 0, sectionRemainingSeconds: 0 }),
    [attempt, remainingTime, sections]
  );
  const activeSection = sections[sectionTiming.activeSectionIndex] || sections[0] || null;
  const currentQuestion = attempt?.exam.questions[currentIndex] || null;
  const currentAnswer = useMemo(
    () => answers.find((answer) => answer.questionId === currentQuestion?._id) || null,
    [answers, currentQuestion]
  );

  const answerMap = useMemo(
    () =>
      answers.reduce((accumulator, answer) => {
        accumulator[answer.questionId] = answer;
        return accumulator;
      }, {}),
    [answers]
  );

  const activeSectionQuestionIndexes = useMemo(() => {
    if (!attempt || !activeSection) {
      return [];
    }

    return attempt.exam.questions.reduce((indexes, question, index) => {
      if ((question.section || "General") === activeSection.title) {
        indexes.push(index);
      }
      return indexes;
    }, []);
  }, [activeSection, attempt]);

  useEffect(() => {
    if (!activeSectionQuestionIndexes.length) {
      return;
    }

    if (!activeSectionQuestionIndexes.includes(currentIndex)) {
      setCurrentIndex(activeSectionQuestionIndexes[0]);
    }
  }, [activeSectionQuestionIndexes, currentIndex]);

  const progressStats = useMemo(() => {
    const attempted = answers.filter((answer) => answer.selectedOptionIds.length > 0).length;
    const skipped = answers.filter((answer) => answer.isSkipped).length;
    const review = answers.filter((answer) => answer.markedForReview).length;
    const total = attempt?.exam.questions.length || 0;
    const completion = total ? Math.round(((attempted + skipped) / total) * 100) : 0;

    return {
      attempted,
      skipped,
      review,
      unanswered: Math.max(total - attempted - skipped, 0),
      completion
    };
  }, [answers, attempt]);

  const activeSectionStats = useMemo(() => {
    if (!attempt || !activeSection) {
      return { answered: 0, skipped: 0, total: 0 };
    }

    const sectionQuestionIds = new Set(
      attempt.exam.questions
        .filter((question) => (question.section || "General") === activeSection.title)
        .map((question) => question._id)
    );

    const sectionAnswers = answers.filter((answer) => sectionQuestionIds.has(answer.questionId));

    return {
      answered: sectionAnswers.filter((answer) => answer.selectedOptionIds.length > 0).length,
      skipped: sectionAnswers.filter((answer) => answer.isSkipped).length,
      total: sectionAnswers.length
    };
  }, [activeSection, answers, attempt]);

  const updateAnswerState = (questionId, updater) => {
    setAnswers((prev) => {
      const nextAnswers = prev.map((answer) =>
        answer.questionId === questionId ? { ...answer, ...updater(answer) } : answer
      );
      answersRef.current = nextAnswers;
      return nextAnswers;
    });
  };

  const saveAnswer = async (questionId, options = {}) => {
    if (!questionId) {
      return;
    }

    setSaveState("saving");

    try {
      await persistAnswer(questionId, options);
      setSaveState("saved");
    } catch (requestError) {
      setSaveState("error");
      throw requestError;
    }
  };

  const queueSave = (questionId) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveAnswer(questionId).catch(() => undefined);
    }, 250);
  };

  const toggleOption = (optionId) => {
    if (!currentQuestion || !currentAnswer) {
      return;
    }

    updateAnswerState(currentQuestion._id, (answer) => {
      let nextSelectedOptionIds = [...answer.selectedOptionIds];

      if (currentQuestion.type === "single") {
        nextSelectedOptionIds = [optionId];
      } else if (nextSelectedOptionIds.includes(optionId)) {
        nextSelectedOptionIds = nextSelectedOptionIds.filter((item) => item !== optionId);
      } else {
        nextSelectedOptionIds.push(optionId);
      }

      return { selectedOptionIds: nextSelectedOptionIds, isSkipped: false, visited: true };
    });

    queueSave(currentQuestion._id);
  };

  const skipQuestion = async () => {
    if (!currentQuestion) {
      return;
    }

    updateAnswerState(currentQuestion._id, () => ({
      selectedOptionIds: [],
      isSkipped: true,
      visited: true
    }));

    try {
      await saveAnswer(currentQuestion._id);
    } catch (requestError) {
      setError("Unable to save skipped state.");
    }
  };

  const clearResponse = async () => {
    if (!currentQuestion) {
      return;
    }

    updateAnswerState(currentQuestion._id, () => ({
      selectedOptionIds: [],
      isSkipped: false,
      visited: true
    }));

    try {
      await saveAnswer(currentQuestion._id);
    } catch (requestError) {
      setError("Unable to clear the response.");
    }
  };

  const toggleReview = async () => {
    if (!currentQuestion) {
      return;
    }

    updateAnswerState(currentQuestion._id, (answer) => ({
      markedForReview: !answer.markedForReview,
      visited: true
    }));

    try {
      await saveAnswer(currentQuestion._id);
    } catch (requestError) {
      setError("Unable to update review status right now.");
    }
  };

  const moveQuestion = async (direction) => {
    if (!currentQuestion || !activeSectionQuestionIndexes.length) {
      return;
    }

    await saveAnswer(currentQuestion._id).catch(() => undefined);

    const currentPosition = activeSectionQuestionIndexes.indexOf(currentIndex);
    const nextPosition = Math.min(Math.max(currentPosition + direction, 0), activeSectionQuestionIndexes.length - 1);
    setCurrentIndex(activeSectionQuestionIndexes[nextPosition]);
  };

  const jumpToQuestion = async (questionId) => {
    if (!attempt) {
      return;
    }

    const nextIndex = attempt.exam.questions.findIndex((question) => question._id === questionId);

    if (!activeSectionQuestionIndexes.includes(nextIndex)) {
      return;
    }

    if (currentQuestion) {
      await saveAnswer(currentQuestion._id).catch(() => undefined);
    }

    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
    }
  };

  const submitExam = async () => {
    if (!attemptRef.current) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (currentQuestion) {
        await saveAnswer(currentQuestion._id);
      }

      const { data } = await api.post(`/exams/attempts/${attemptRef.current.resultId}/submit`);

      if (fullscreenSupported && getFullscreenElement()) {
        await exitDocumentFullscreen().catch(() => undefined);
      }

      navigate(`/results/${data._id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit exam");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader label="Preparing exam..." />;
  }

  if (error && !attempt) {
    return (
      <div className="page-shell mx-auto max-w-4xl">
        <Card>
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      </div>
    );
  }

  if (!attempt || !currentQuestion || !currentAnswer) {
    return (
      <div className="page-shell mx-auto max-w-4xl">
        <Card>
          <p className="text-sm text-red-300">Unable to load the exam question. Please refresh and try again.</p>
        </Card>
      </div>
    );
  }

  const currentSectionPosition = activeSectionQuestionIndexes.indexOf(currentIndex);

  return (
    <div className="exam-shell mx-auto max-w-6xl">
      <div className="space-y-4">
        <Card className="rounded-[28px] p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-kicker">{attempt.isResumedAttempt ? "Resumed Attempt" : "Live Exam"}</p>
                <h1 className="mt-4 break-words text-xl font-semibold text-white sm:text-2xl">{attempt.exam.title}</h1>
                <p className="mt-2 text-sm text-muted">
                  {activeSection ? `${activeSection.title} | ` : ""}Question {currentSectionPosition + 1} of {activeSectionQuestionIndexes.length || attempt.exam.questions.length}
                </p>
              </div>
              <div className="grid gap-2">
                <div className="metric-tile min-w-[118px] text-center">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Overall</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatCountdown(remainingTime)}</p>
                </div>
                {activeSection ? (
                  <div className="metric-tile min-w-[118px] text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Section</p>
                    <p className="mt-2 text-xl font-semibold text-white">{formatCountdown(sectionTiming.sectionRemainingSeconds)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted">
                <span>Progress</span>
                <span>{progressStats.completion}% done</span>
              </div>
              <div className="h-3 rounded-full bg-white/8 p-[3px]">
                <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${progressStats.completion}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
              <div className="rounded-2xl bg-emerald-500/12 px-2 py-3 text-emerald-100">{progressStats.attempted} answered</div>
              <div className="rounded-2xl bg-amber-500/12 px-2 py-3 text-amber-100">{progressStats.skipped} skipped</div>
              <div className="rounded-2xl bg-rose-500/12 px-2 py-3 text-rose-100">{progressStats.review} review</div>
              <div className="rounded-2xl bg-white/5 px-2 py-3 text-neutral-200">{progressStats.unanswered} left</div>
            </div>
          </div>
        </Card>

        {activeSection ? (
          <Card className="rounded-[24px] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted">Active Section</p>
                <h2 className="mt-2 text-lg font-semibold text-white">{activeSection.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  Cutoff: {activeSection.cutoffMarks} | Answered {activeSectionStats.answered} | Skipped {activeSectionStats.skipped}
                </p>
              </div>
              <span className="soft-chip">{sectionTiming.sectionRemainingSeconds > 0 ? "Section timer running" : "Section moving"}</span>
            </div>
          </Card>
        ) : null}

        {tabWarning ? <p className="rounded-2xl bg-amber-950/40 px-4 py-3 text-sm text-amber-100">{tabWarning}</p> : null}
        {fullscreenWarning ? <p className="rounded-2xl bg-red-950/35 px-4 py-3 text-sm text-red-100">{fullscreenWarning}</p> : null}

        {needsFullscreen && fullscreenSupported ? (
          <Card className="rounded-[28px] p-4 text-center">
            <p className="text-sm text-red-100">Re-enter fullscreen to continue the exam.</p>
            <Button className="mt-4 w-full sm:w-auto" onClick={requestFullscreen}>
              Enter Fullscreen
            </Button>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="rounded-[28px] p-4 sm:p-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted">
                <span>{currentQuestion.section || "General"}</span>
                <span>|</span>
                <span>{currentQuestion.type === "single" ? "Single correct" : "Multiple correct"}</span>
                <span>|</span>
                <span>{currentQuestion.marks} marks</span>
                {currentAnswer.isSkipped ? <span className="rounded-full bg-amber-500/12 px-2 py-1 tracking-normal text-amber-200">Skipped</span> : null}
                {currentAnswer.markedForReview ? <span className="rounded-full bg-rose-500/12 px-2 py-1 tracking-normal text-rose-200">Review</span> : null}
              </div>

              <h2 className="text-lg font-semibold leading-8 text-white sm:text-xl">{currentQuestion.prompt}</h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const checked = currentAnswer.selectedOptionIds.includes(option._id);

                  return (
                    <button
                      key={option._id}
                      onClick={() => toggleOption(option._id)}
                      className={`flex w-full items-start gap-4 rounded-[22px] border px-4 py-4 text-left transition ${
                        checked
                          ? "border-emerald-300 bg-emerald-500/12 text-white"
                          : "border-white/10 bg-black/30 text-white hover:border-white/16 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                          checked ? "border-emerald-200 bg-emerald-200 text-black" : "border-white/20 text-muted"
                        }`}
                      >
                        {getOptionLabel(optionIndex)}
                      </span>
                      <span className="text-sm leading-6">{option.text}</span>
                    </button>
                  );
                })}

                {currentQuestion.enableSkipOption !== false ? (
                  <button
                    onClick={skipQuestion}
                    className={`flex w-full items-start gap-4 rounded-[22px] border px-4 py-4 text-left transition ${
                      currentAnswer.isSkipped
                        ? "border-amber-300 bg-amber-500/12 text-white"
                        : "border-white/10 bg-black/30 text-white hover:border-white/16 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        currentAnswer.isSkipped ? "border-amber-200 bg-amber-200 text-black" : "border-white/20 text-muted"
                      }`}
                    >
                      S
                    </span>
                    <span className="text-sm leading-6">Skip this question without negative marking</span>
                  </button>
                ) : null}
              </div>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => moveQuestion(-1)} disabled={currentSectionPosition <= 0}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => moveQuestion(1)}
                  disabled={currentSectionPosition === activeSectionQuestionIndexes.length - 1}
                >
                  Next
                </Button>
                <Button variant="secondary" onClick={toggleReview}>
                  {currentAnswer.markedForReview ? "Unmark Review" : "Mark for Review"}
                </Button>
                <Button variant="secondary" onClick={clearResponse}>
                  Clear Answer
                </Button>
                <Button className="sm:col-span-2" onClick={submitExam} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Exam"}
                </Button>
              </div>

              <p className="text-xs text-muted">
                Autosave: {saveState === "saving" ? "Saving..." : saveState === "error" ? "Retry pending" : "Saved"} |
                Tab switches: {tabSwitchCount} | Fullscreen exits: {fullscreenExitCount}
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            <ExamPalette
              questions={attempt.exam.questions}
              answerMap={answerMap}
              currentQuestionId={currentQuestion._id}
              onJump={jumpToQuestion}
            />

            <Card className="rounded-[24px] p-4">
              <h3 className="text-sm font-semibold text-white">Quick rules</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
                <li>Only the active section is navigable while its timer is running.</li>
                <li>Answered questions show green.</li>
                <li>Skipped questions show amber and do not get negative marks.</li>
                <li>Review questions show red in the palette.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
