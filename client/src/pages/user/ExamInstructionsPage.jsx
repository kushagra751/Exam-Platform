import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { isFullscreenSupported, requestDocumentFullscreen } from "../../utils/fullscreen";
import { shareExamLink } from "../../utils/pwa";
import { formatNegativeMarking } from "../../utils/format";

export const ExamInstructionsPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const fullscreenSupported = isFullscreenSupported();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullscreenWarning, setFullscreenWarning] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/exams/${examId}`);
        setExam(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load exam");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [examId]);

  const requestExamFullscreen = async () => {
    if (!fullscreenSupported) {
      setFullscreenWarning("This browser does not allow fullscreen here. The exam will continue in normal view.");
      return;
    }

    try {
      await requestDocumentFullscreen();
    } catch (fullscreenError) {
      setFullscreenWarning("Fullscreen was blocked. You can continue, and the exam will ask again if needed.");
    }
  };

  const beginAttempt = async () => {
    setError("");

    try {
      await requestExamFullscreen();
      const { data } = await api.post(`/exams/${examId}/start`);

      if (data.alreadySubmitted && data.resultId) {
        navigate(`/results/${data.resultId}`);
        return;
      }

      navigate(`/exam/${examId}/attempt`);
    } catch (requestError) {
      if (requestError.response?.data?.alreadySubmitted && requestError.response?.data?.resultId) {
        navigate(`/results/${requestError.response.data.resultId}`);
        return;
      }

      setError(requestError.response?.data?.message || "Unable to start exam");
    }
  };

  const shareExam = async () => {
    if (!exam) {
      return;
    }

    const outcome = await shareExamLink({
      title: exam.title,
      text: "Join this exam on Exam Platform",
      url: window.location.href
    }).catch(() => "failed");

    if (outcome === "copied") {
      setShareMessage("Exam link copied.");
    } else if (outcome === "shared") {
      setShareMessage("Exam shared.");
    } else {
      setShareMessage("Exam share nahi ho paaya.");
    }
  };

  if (loading) {
    return <Loader label="Loading exam instructions..." />;
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-4xl rounded-[32px] p-6">
        <p className="text-sm text-red-300">{error}</p>
      </Card>
    );
  }

  return (
    <div className="page-shell mx-auto max-w-5xl">
      <Card className="rounded-[34px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">Instructions</p>
            <h1 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">{exam.title}</h1>
            <p className="mt-4 text-sm leading-7 text-muted">{exam.description}</p>
          </div>

          <div className="metric-tile min-w-[180px]">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Attempt Limit</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {exam.hasUnlimitedAttempts ? "Unlimited" : `${exam.attemptsRemaining} left`}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {exam.subject || exam.topic || exam.playlist ? (
            <div className="metric-tile">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Track</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {[exam.subject, exam.topic, exam.playlist].filter(Boolean).join(" / ")}
              </p>
            </div>
          ) : null}
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Duration</p>
            <p className="mt-2 text-3xl font-semibold text-white">{exam.duration}</p>
            <p className="text-xs text-muted">minutes</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Questions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{exam.questions.length}</p>
            <p className="text-xs text-muted">total prompts</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Negative</p>
            <p className="mt-2 text-3xl font-semibold text-white">{formatNegativeMarking(exam.negativeMarking)}</p>
            <p className="text-xs text-muted">per wrong answer</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Mode</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {fullscreenSupported ? "Secure fullscreen" : "Standard browser view"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Before You Begin</p>
            <div className="mt-5 space-y-4">
              {[
                "Answers are auto-saved whenever you move between questions.",
                "The exam timer keeps running after you start and auto-submits when time ends.",
                "Tab switching is tracked as a basic anti-cheating signal."
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-white shadow-soft" />
                  <p className="text-sm leading-6 text-neutral-200">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/35 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Attempt Flow</p>
            <div className="mt-5 space-y-4">
              <div className="metric-tile">
                <p className="text-sm leading-6 text-white">
                  {fullscreenSupported
                    ? "The exam opens in fullscreen and asks you to re-enter if you leave it."
                    : "This browser may keep the exam in normal view, but tab switching is still tracked."}
                </p>
              </div>
              <div className="metric-tile">
                <p className="text-sm leading-6 text-white">
                  You can navigate freely using next, previous, and the question palette throughout the attempt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}
        {exam.isLocked ? (
          <p className="mt-4 text-sm text-amber-200">
            {exam.lockedUntil
              ? `This exam is locked until ${new Date(exam.lockedUntil).toLocaleString()}.`
              : "This exam is currently locked by the admin."}
          </p>
        ) : null}
        {fullscreenWarning ? <p className="mt-4 text-sm text-amber-200">{fullscreenWarning}</p> : null}
        {shareMessage ? <p className="mt-4 text-sm text-neutral-200">{shareMessage}</p> : null}

        <div className="glass-divider mt-8" />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {exam.hasActiveAttempt
              ? "You already have an active attempt. Continuing will resume it from where you left off."
              : "Start when you are ready. The timer begins as soon as the attempt loads."}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={shareExam}>
              Share Exam
            </Button>
            <Button className="w-full sm:w-auto" onClick={beginAttempt} disabled={exam.isLocked}>
              {exam.isLocked ? "Locked" : exam.hasActiveAttempt ? "Resume Exam" : "Begin Exam"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
