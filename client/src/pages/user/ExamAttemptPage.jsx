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
import { enqueueAttemptAction, flushAttemptQueue, getQueuedAttemptCount } from "../../utils/offlineAttemptQueue";

const getOptionLabel = (index) => String.fromCharCode(65 + index);

export const ExamAttemptPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const fullscreenSupported = isFullscreenSupported();
  const saveTimerRef = useRef(null);
  const answersRef = useRef([]);
  const attemptRef = useRef(null);
  const currentIndexRef = useRef(0);
  const questionStartRef = useRef(Date.now());
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
  const [needsFullscreen, setNeedsFullscreen] = useState(fullscreenSupported);
  const [queuedSaveCount, setQueuedSaveCount] = useState(getQueuedAttemptCount());

  const syncAttemptCounters = (data) => {
    setTabSwitchCount(data.tabSwitchCount || 0);
    setFullscreenEnterCount(data.fullscreenEnterCount || 0);
    setFullscreenExitCount(data.fullscreenExitCount || 0);
  };

  const updateAnswerState = (questionId, updater) => {
    setAnswers((prev) => {
      const nextAnswers = prev.map((answer) =>
        answer.questionId === questionId ? { ...answer, ...updater(answer) } : answer
      );
      answersRef.current = nextAnswers;
      return nextAnswers;
    });
  };

  const trackTimeForQuestion = (questionId) => {
    if (!questionId) {
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - questionStartRef.current) / 1000));

    if (!elapsedSeconds) {
      questionStartRef.current = Date.now();
      return;
    }

    updateAnswerState(questionId, (answer) => ({
      timeSpentSeconds: Number(answer.timeSpentSeconds || 0) + elapsedSeconds
    }));
    questionStartRef.current = Date.now();
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

    const payload = {
      questionId,
      selectedOptionIds: answer.selectedOptionIds,
      visited: true,
      isSkipped: answer.isSkipped,
      markedForReview: answer.markedForReview,
      timeSpentSeconds: answer.timeSpentSeconds || 0,
      tabSwitched,
      fullscreenEntered,
      fullscreenExited
    };
    const response = await api.put(`/exams/attempts/${currentAttempt.resultId}/answer`, payload);

    syncAttemptCounters(response.data);
    return { data: response.data, payload };
  };

  const syncQueuedSaves = async () => {
    if (!navigator.onLine) {
      return;
    }

    setSaveState("saving");

    try {
      const synced = await flushAttemptQueue(api);
      setQueuedSaveCount(getQueuedAttemptCount());
      setSaveState(getQueuedAttemptCount() ? "queued" : "saved");

      if (synced > 0) {
        setError("");
      }
    } catch (error) {
      setSaveState(getQueuedAttemptCount() ? "queued" : "error");
    }
  };

  const saveAnswer = async (questionId, options = {}) => {
    if (!questionId) {
      return;
    }

    setSaveState("saving");

    try {
      await persistAnswer(questionId, options);
      setQueuedSaveCount(getQueuedAttemptCount());
      setSaveState("saved");
    } catch (requestError) {
      const currentAttempt = attemptRef.current;
      const answer = answersRef.current.find((item) => item.questionId === questionId);
      const isOfflineLikeError = !requestError.response;

      if (currentAttempt && answer && isOfflineLikeError) {
        enqueueAttemptAction({
          kind: "answer",
          resultId: currentAttempt.resultId,
          questionId,
          payload: {
            questionId,
            selectedOptionIds: answer.selectedOptionIds,
            visited: true,
            isSkipped: answer.isSkipped,
            markedForReview: answer.markedForReview,
            timeSpentSeconds: answer.timeSpentSeconds || 0,
            ...options
          }
        });
        setQueuedSaveCount(getQueuedAttemptCount());
        setSaveState("queued");
        return;
      }

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

      const enteredFullscreen = Boolean(getFullscreenElement());
      setNeedsFullscreen(!enteredFullscreen);
      setFullscreenWarning(enteredFullscreen ? "" : "Fullscreen could not start automatically. Tap below to continue.");
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
          isSkipped: Boolean(answer.isSkipped),
          timeSpentSeconds: Number(answer.timeSpentSeconds || 0)
        }));

        attemptRef.current = data;
        answersRef.current = mappedAnswers;
        setAttempt(data);
        setAnswers(mappedAnswers);
        syncAttemptCounters(data);
        setRemainingTime(getTimeRemainingInSeconds(data.startedAt, data.exam.duration));
        questionStartRef.current = Date.now();
        setNeedsFullscreen(fullscreenSupported && !getFullscreenElement());
        setQueuedSaveCount(getQueuedAttemptCount());

        if (fullscreenSupported) {
          await requestFullscreen();
        }

        await syncQueuedSaves();
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
      trackTimeForQuestion(activeQuestionId);

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

    const onFocus = () => {
      if (attemptRef.current && !getFullscreenElement()) {
        setNeedsFullscreen(true);
        setFullscreenWarning("Return to fullscreen to continue the exam.");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
    };
  }, [fullscreenSupported]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onOnline = () => {
      syncQueuedSaves().catch(() => undefined);
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

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

  const examLockedByFullscreen = fullscreenSupported && needsFullscreen;

  const updateSelection = (optionId) => {
    if (!currentQuestion || !currentAnswer || examLockedByFullscreen) {
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
    if (!currentQuestion || examLockedByFullscreen) {
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
    if (!currentQuestion || examLockedByFullscreen) {
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
    if (!currentQuestion || examLockedByFullscreen) {
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
    if (!currentQuestion || !attempt || examLockedByFullscreen) {
      return;
    }

    trackTimeForQuestion(currentQuestion._id);
    await saveAnswer(currentQuestion._id).catch(() => undefined);

    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      attempt.exam.questions.length - 1
    );

    questionStartRef.current = Date.now();
    setCurrentIndex(nextIndex);
  };

  const jumpToQuestion = async (questionId) => {
    if (!attempt || examLockedByFullscreen) {
      return;
    }

    const nextIndex = attempt.exam.questions.findIndex((question) => question._id === questionId);

    if (nextIndex < 0) {
      return;
    }

    if (currentQuestion) {
      trackTimeForQuestion(currentQuestion._id);
      await saveAnswer(currentQuestion._id).catch(() => undefined);
    }

    questionStartRef.current = Date.now();
    setCurrentIndex(nextIndex);
  };

  const submitExam = async () => {
    if (!attemptRef.current || examLockedByFullscreen) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (currentQuestion) {
        trackTimeForQuestion(currentQuestion._id);
        await saveAnswer(currentQuestion._id);
      }

      await syncQueuedSaves();

      if (!navigator.onLine || getQueuedAttemptCount() > 0) {
        setError("You are offline. Answers are queued safely, but final submit needs internet.");
        setSubmitting(false);
        return;
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
    <div className="exam-shell mx-auto max-w-6xl">
      <div className="space-y-4">
        <Card className="rounded-[28px] p-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-kicker">{attempt.isResumedAttempt ? "Resumed Attempt" : "Live Exam"}</p>
                <h1 className="mt-4 break-words text-xl font-semibold text-white sm:text-2xl">{attempt.exam.title}</h1>
                <p className="mt-2 text-sm text-muted">
                  Question {currentIndex + 1} of {attempt.exam.questions.length}
                </p>
              </div>
              <div className="metric-tile min-w-[118px] text-center">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Overall</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatCountdown(remainingTime)}</p>
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

        {tabWarning ? <p className="rounded-2xl bg-amber-950/40 px-4 py-3 text-sm text-amber-100">{tabWarning}</p> : null}
        {fullscreenWarning ? <p className="rounded-2xl bg-red-950/35 px-4 py-3 text-sm text-red-100">{fullscreenWarning}</p> : null}

        {examLockedByFullscreen ? (
          <Card className="rounded-[28px] p-4 text-center">
            <p className="text-sm text-red-100">Exam tab abhi locked hai. Continue karne ke liye fullscreen me wapas aao.</p>
            <Button className="mt-4 w-full sm:w-auto" onClick={requestFullscreen}>
              Enter Fullscreen
            </Button>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card className={`rounded-[28px] p-4 sm:p-5 ${examLockedByFullscreen ? "pointer-events-none opacity-45" : ""}`}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-muted">
                <span>{currentQuestion.type === "single" ? "Single correct" : "Multiple correct"}</span>
                <span>|</span>
                <span>{currentQuestion.marks} marks</span>
                {currentAnswer.isSkipped ? <span className="rounded-full bg-amber-500/12 px-2 py-1 tracking-normal text-amber-200">Not attempted</span> : null}
                {currentAnswer.markedForReview ? <span className="rounded-full bg-rose-500/12 px-2 py-1 tracking-normal text-rose-200">Review</span> : null}
              </div>

              <h2 className="text-lg font-semibold leading-8 text-white sm:text-xl">{currentQuestion.prompt}</h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const checked = currentAnswer.selectedOptionIds.includes(option._id);

                  return (
                    <button
                      key={option._id}
                      onClick={() => updateSelection(option._id)}
                      disabled={examLockedByFullscreen}
                      className={`flex w-full items-start gap-4 rounded-[22px] border px-4 py-4 text-left transition ${
                        checked
                          ? "border-emerald-300 bg-emerald-500/12 text-white"
                          : "border-white/10 bg-black/30 text-white hover:border-white/16 hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${checked ? "border-emerald-200 bg-emerald-200 text-black" : "border-white/20 text-muted"}`}>
                        {getOptionLabel(optionIndex)}
                      </span>
                      <span className="text-sm leading-6">{option.text}</span>
                    </button>
                  );
                })}

                <button
                  onClick={skipQuestion}
                  disabled={examLockedByFullscreen}
                  className={`flex w-full items-start gap-4 rounded-[22px] border px-4 py-4 text-left transition ${
                    currentAnswer.isSkipped
                      ? "border-amber-300 bg-amber-500/12 text-white"
                      : "border-white/10 bg-black/30 text-white hover:border-white/16 hover:bg-white/[0.05]"
                  }`}
                >
                  <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${currentAnswer.isSkipped ? "border-amber-200 bg-amber-200 text-black" : "border-white/20 text-muted"}`}>
                    E
                  </span>
                  <span className="text-sm leading-6">5th option: no negative mark and count as not attempted</span>
                </button>
              </div>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => moveQuestion(-1)} disabled={examLockedByFullscreen || currentIndex <= 0}>
                  Previous
                </Button>
                <Button variant="secondary" onClick={() => moveQuestion(1)} disabled={examLockedByFullscreen || currentIndex >= attempt.exam.questions.length - 1}>
                  Next
                </Button>
                <Button variant="secondary" onClick={toggleReview} disabled={examLockedByFullscreen}>
                  {currentAnswer.markedForReview ? "Unmark Review" : "Mark for Review"}
                </Button>
                <Button variant="secondary" onClick={clearResponse} disabled={examLockedByFullscreen}>
                  Clear Answer
                </Button>
                <Button className="sm:col-span-2" onClick={submitExam} disabled={examLockedByFullscreen || submitting}>
                  {submitting ? "Submitting..." : "Submit Exam"}
                </Button>
              </div>

              <p className="text-xs text-muted">
                Autosave: {saveState === "saving" ? "Saving..." : saveState === "queued" ? `Offline queued (${queuedSaveCount})` : saveState === "error" ? "Retry pending" : "Saved"} |
                Time on this question: {currentAnswer.timeSpentSeconds || 0}s | Tab switches: {tabSwitchCount} | Fullscreen exits: {fullscreenExitCount}
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            <ExamPalette
              questions={attempt.exam.questions}
              answerMap={answerMap}
              currentQuestionId={currentQuestion._id}
              onJump={jumpToQuestion}
              disabled={examLockedByFullscreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
