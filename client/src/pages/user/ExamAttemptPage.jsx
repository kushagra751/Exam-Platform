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
      setFullscreenWarning(
        "Your browser does not support fullscreen mode. You can continue in standard view while activity is still tracked."
      );
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
      setFullscreenWarning("Fullscreen could not start automatically. Tap the button below to continue.");
    }
  };

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        const { data } = await api.post(`/exams/${examId}/start`);
        const mappedAnswers = data.answers.map((answer) => ({
          ...answer,
          questionId: answer.questionId.toString(),
          selectedOptionIds: answer.selectedOptionIds.map((id) => id.toString())
        }));

        attemptRef.current = data;
        answersRef.current = mappedAnswers;
        currentIndexRef.current = 0;
        setAttempt(data);
        setAnswers(mappedAnswers);
        syncAttemptCounters(data);
        setRemainingTime(getTimeRemainingInSeconds(data.startedAt, data.exam.duration));

        if (fullscreenSupported) {
          await requestFullscreen();
        } else {
          setFullscreenWarning(
            "Fullscreen controls are limited in this browser. The exam will stay usable and tab switching will still be tracked."
          );
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
  }, [examId, fullscreenSupported, navigate]);

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

      setTabWarning("Warning: tab switching was detected. Return to the exam and continue in fullscreen.");
      setNeedsFullscreen(true);
      setFullscreenWarning("You left the exam screen. Re-enter fullscreen before continuing.");

      if (getFullscreenElement()) {
        try {
          await exitDocumentFullscreen();
        } catch (fullscreenError) {
          // Ignore exit failures. The secure-mode overlay still protects the exam flow.
        }
      }

      if (activeQuestionId) {
        try {
          setSaveState("saving");
          await persistAnswer(activeQuestionId, { tabSwitched: true });
          setSaveState("saved");
        } catch (requestError) {
          setSaveState("error");
        }
      }
    };

    const onFullscreenChange = () => {
      const active = Boolean(getFullscreenElement());

      setNeedsFullscreen(!active);

      if (active) {
        setFullscreenWarning("");
        return;
      }

      if (attemptRef.current && !submittingRef.current) {
        setFullscreenWarning("Fullscreen exited. Tap below to return to secure mode.");

        if (wasFullscreenRef.current) {
          wasFullscreenRef.current = false;

          const activeQuestionId = attemptRef.current.exam.questions[currentIndexRef.current]?._id;

          if (activeQuestionId) {
            persistAnswer(activeQuestionId, { fullscreenExited: true }).catch(() => setSaveState("error"));
          }
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
    const onBeforeUnload = (event) => {
      if (!attemptRef.current || submittingRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (fullscreenSupported && getFullscreenElement()) {
        exitDocumentFullscreen().catch(() => undefined);
      }
    };
  }, [fullscreenSupported]);

  const currentQuestion = attempt?.exam.questions[currentIndex] || null;

  const currentAnswer = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }

    return answers.find((answer) => answer.questionId === currentQuestion._id) || null;
  }, [answers, currentQuestion]);

  const answerMap = useMemo(
    () =>
      answers.reduce((accumulator, answer) => {
        accumulator[answer.questionId] = answer;
        return accumulator;
      }, {}),
    [answers]
  );

  const attemptedCount = useMemo(
    () => answers.filter((answer) => answer.selectedOptionIds.length > 0).length,
    [answers]
  );

  const reviewCount = useMemo(
    () => answers.filter((answer) => answer.markedForReview).length,
    [answers]
  );

  const unansweredCount = useMemo(
    () => answers.filter((answer) => answer.selectedOptionIds.length === 0).length,
    [answers]
  );

  const completionPercentage = useMemo(() => {
    if (!attempt?.exam?.questions?.length) {
      return 0;
    }

    return Math.round((attemptedCount / attempt.exam.questions.length) * 100);
  }, [attempt, attemptedCount]);

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

      return { selectedOptionIds: nextSelectedOptionIds, visited: true };
    });

    queueSave(currentQuestion._id);
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
    if (!currentQuestion || !attempt) {
      return;
    }

    try {
      await saveAnswer(currentQuestion._id);
    } catch (requestError) {
      setError("Unable to save the current answer.");
    }

    setCurrentIndex((prev) => Math.min(Math.max(prev + direction, 0), attempt.exam.questions.length - 1));
  };

  const jumpToQuestion = async (questionId) => {
    if (!attempt) {
      return;
    }

    if (currentQuestion) {
      try {
        await saveAnswer(currentQuestion._id);
      } catch (requestError) {
        setError("Unable to save the current answer.");
      }
    }

    const nextIndex = attempt.exam.questions.findIndex((question) => question._id === questionId);

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

  return (
    <div className="exam-shell mx-auto max-w-7xl">
      <div className="mb-4 space-y-4 sm:mb-6">
        <div
          className="ui-card rounded-[32px] p-4 sm:p-5"
          style={{ top: "calc(var(--safe-top) + 0.5rem)" }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="section-kicker">Live Attempt</p>
              <h1 className="mt-5 break-words text-2xl font-semibold text-white sm:text-4xl">{attempt.exam.title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Attempt #{attempt.attemptNumber} | Question {currentIndex + 1} of {attempt.exam.questions.length}
              </p>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-muted">
                  <span>Progress</span>
                  <span>{completionPercentage}% complete</span>
                </div>
                <div className="h-3 rounded-full bg-white/8 p-[3px]">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <div className="metric-tile text-center sm:min-w-[172px]">
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Time Remaining</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {formatCountdown(remainingTime)}
                </h2>
              </div>
              <div className="metric-tile text-center sm:min-w-[172px]">
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Autosave</p>
                <h2 className="mt-2 text-base font-semibold text-white sm:text-lg">
                  {saveState === "saving" ? "Saving..." : saveState === "error" ? "Retry pending" : "Saved"}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {tabWarning ? (
          <div className="rounded-2xl border border-amber-200/30 bg-amber-950/40 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-amber-100">{tabWarning}</p>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Tab Switches: {tabSwitchCount}</p>
            </div>
          </div>
        ) : null}

        {fullscreenWarning ? (
          <div
            className={`rounded-2xl px-4 py-4 sm:px-5 ${
              needsFullscreen
                ? "border border-red-200/30 bg-red-950/40"
                : "border border-white/10 bg-white/5"
            }`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-sm font-semibold ${needsFullscreen ? "text-red-100" : "text-white"}`}>
                  {fullscreenWarning}
                </p>
                <p className={`mt-1 text-sm ${needsFullscreen ? "text-red-200" : "text-muted"}`}>
                  {fullscreenSupported
                    ? "Re-enter fullscreen to continue the exam without interruption."
                    : "Fullscreen is not available here, so the exam continues in the normal browser view."}
                </p>
              </div>
              {needsFullscreen && fullscreenSupported ? (
                <Button className="w-full sm:w-auto" onClick={requestFullscreen}>
                  Enter Fullscreen
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        {needsFullscreen && fullscreenSupported ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/85 p-4 backdrop-blur-sm sm:p-6">
            <div className="max-w-xl rounded-3xl border border-red-200/30 bg-red-950/70 p-6 text-center shadow-panel">
              <p className="text-xs uppercase tracking-[0.35em] text-red-200">Secure Mode Required</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Return to fullscreen to continue the exam</h2>
              <p className="mt-3 text-sm text-red-100">
                The exam is paused behind this screen. Re-enter fullscreen to access questions, navigation, and
                answer selection again.
              </p>
              <div className="mt-6 flex justify-center">
                <Button onClick={requestFullscreen}>Enter Fullscreen</Button>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={`grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] ${
            needsFullscreen && fullscreenSupported ? "pointer-events-none select-none blur-[2px]" : ""
          }`}
        >
          <Card className="min-w-0 rounded-[32px] p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted">
              <span>Question</span>
              <span>|</span>
              <span>{currentQuestion.type === "single" ? "Single correct" : "Multiple correct"}</span>
              <span>|</span>
              <span>{currentQuestion.marks} marks</span>
            </div>

            <h2 className="mt-4 break-words text-xl font-semibold leading-relaxed text-white sm:text-2xl">
              {currentQuestion.prompt}
            </h2>

            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const checked = currentAnswer.selectedOptionIds.includes(option._id);

                return (
                  <button
                    key={option._id}
                    onClick={() => toggleOption(option._id)}
                    className={`flex w-full items-start gap-4 rounded-[24px] border px-4 py-4 text-left transition duration-200 ${
                      checked
                        ? "border-white bg-white text-black shadow-soft"
                        : "border-white/10 bg-black/30 text-white hover:border-white/16 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span
                      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        checked ? "border-black bg-black text-white" : "border-white/20 text-muted"
                      }`}
                    >
                      {getOptionLabel(optionIndex)}
                    </span>
                    <span className="text-sm leading-6 sm:text-base">{option.text}</span>
                  </button>
                );
              })}
            </div>

            {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button variant="secondary" onClick={() => moveQuestion(-1)} disabled={currentIndex === 0}>
                Previous
              </Button>
              <Button variant="secondary" onClick={toggleReview}>
                {currentAnswer.markedForReview ? "Unmark Review" : "Mark for Review"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => moveQuestion(1)}
                disabled={currentIndex === attempt.exam.questions.length - 1}
              >
                Next
              </Button>
              <Button onClick={submitExam} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Exam"}
              </Button>
            </div>
          </Card>

          <div className="space-y-4 xl:sticky xl:top-6">
            <ExamPalette
              questions={attempt.exam.questions}
              answerMap={answerMap}
              currentQuestionId={currentQuestion._id}
              onJump={jumpToQuestion}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card>
                <h3 className="text-sm font-semibold text-white">Exam Rules</h3>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-muted">
                  <li>Every selection is auto-saved.</li>
                  <li>Tab switching is tracked and shown immediately as a warning.</li>
                  <li>Fullscreen mode is required when the browser supports it.</li>
                  <li>The timer will submit the exam automatically.</li>
                </ul>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">Progress Snapshot</h3>
                  <span className="soft-chip">{completionPercentage}% done</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted">
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p>Attempted</p>
                    <p className="mt-1 text-lg font-semibold text-white">{attemptedCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p>Review</p>
                    <p className="mt-1 text-lg font-semibold text-white">{reviewCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p>Unanswered</p>
                    <p className="mt-1 text-lg font-semibold text-white">{unansweredCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p>Tab Switches</p>
                    <p className="mt-1 text-lg font-semibold text-white">{tabSwitchCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p>FS Enters</p>
                    <p className="mt-1 text-lg font-semibold text-white">{fullscreenEnterCount}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-3">
                    <p>FS Exits</p>
                    <p className="mt-1 text-lg font-semibold text-white">{fullscreenExitCount}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
