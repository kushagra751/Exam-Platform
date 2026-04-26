import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { formatDateOnly, formatNegativeMarking } from "../../utils/format";

const getAnswerTone = (answer) => {
  if (answer.isSkipped) {
    return {
      badge: "Skipped",
      container: "border-amber-400/30 bg-amber-500/10",
      text: "text-amber-100"
    };
  }

  if (answer.isCorrect) {
    return {
      badge: "Correct",
      container: "border-emerald-400/30 bg-emerald-500/10",
      text: "text-emerald-100"
    };
  }

  return {
    badge: "Incorrect",
    container: "border-rose-400/30 bg-rose-500/10",
    text: "text-rose-100"
  };
};

export const ResultDetailPage = () => {
  const { resultId } = useParams();
  const { user } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/results/${resultId}`);
        setResult(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load result");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resultId]);

  const summaryCards = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: "Score", value: result.score },
      { label: "Correct", value: result.correctCount },
      { label: "Wrong", value: result.incorrectCount },
      { label: "Skipped", value: result.unansweredCount },
      { label: "Time Taken", value: `${result.analyzer?.durationMinutes || 0}m` },
      { label: "Negative", value: formatNegativeMarking(result.exam.negativeMarking || 0) }
    ];
  }, [result]);

  if (loading) {
    return <Loader label="Loading result..." />;
  }

  if (error || !result) {
    return (
      <div className="page-shell mx-auto max-w-4xl">
        <Card>
          <p className="text-sm text-red-300">{error || "Result not found"}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell mx-auto max-w-6xl space-y-4">
      <Card className="rounded-[30px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="section-kicker">{result.exam.examKind === "current-affairs" ? "Current Affairs Result" : "Result"}</p>
            <h1 className="mt-4 break-words text-2xl font-semibold text-white sm:text-3xl">{result.exam.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {result.exam.examKind === "current-affairs"
                ? `${result.exam.language === "hindi" ? "Hindi" : "English"} | ${
                    result.exam.currentAffairsCategory === "state"
                      ? result.exam.stateName || "State"
                      : "India"
                  } current affairs`
                : "Detailed performance summary"}
            </p>
          </div>
          <Link to={user?.role === "admin" ? "/admin/results" : "/dashboard"} className="block">
            <Button variant="secondary" className="w-full sm:w-auto">
              Back
            </Button>
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {summaryCards.map((item) => (
            <div key={item.label} className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{item.label}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{item.value}</h2>
            </div>
          ))}
        </div>
      </Card>

      {result.analyzer ? (
        <Card className="rounded-[30px] p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { label: "Accuracy", value: `${result.analyzer.accuracy}%` },
              { label: "Attempt Rate", value: `${result.analyzer.attemptedRate}%` },
              { label: "Skip Rate", value: `${result.analyzer.skipRate}%` },
              { label: "Avg Time", value: `${result.analyzer.avgSecondsPerQuestion}s` },
              { label: "Tracked", value: `${result.analyzer.totalTrackedSeconds}s` }
            ].map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{item.label}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{item.value}</h3>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Focus Review</p>
              <div className="mt-3 space-y-2 text-sm text-white">
                {result.analyzer.reviewQuestionNumbers?.length ? (
                  result.analyzer.reviewQuestionNumbers.map((item) => (
                    <p key={`${item.questionNumber}-${item.timeSpentSeconds}`}>
                      Q{item.questionNumber} - {item.timeSpentSeconds}s - {item.marksImpact} marks
                    </p>
                  ))
                ) : (
                  <p className="text-muted">No risky wrong answers captured.</p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Suggestions</p>
              <div className="mt-3 space-y-2 text-sm text-white">
                {result.analyzer.recommendations.slice(0, 3).map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {result.detailedAnswers.map((answer, index) => {
          const selectedIds = answer.selectedOptionIds.map((id) => id.toString());
          const correctIds = answer.correctOptionIds.map((id) => id.toString());
          const tone = getAnswerTone(answer);
          const userAnswerText =
            answer.isSkipped || selectedIds.length === 0
              ? "Not attempted"
              : answer.options
                  .filter((option) => selectedIds.includes(option._id.toString()))
                  .map((option) => option.text)
                  .join(", ");
          const correctAnswerText = answer.options
            .filter((option) => correctIds.includes(option._id.toString()))
            .map((option) => option.text)
            .join(", ");

          return (
            <Card key={answer.questionId} className={`rounded-[28px] border ${tone.container} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="soft-chip">Q{index + 1}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.text} bg-black/25`}>
                  {tone.badge}
                </span>
                <span className="soft-chip">{answer.timeSpentSeconds || 0}s</span>
                {answer.eventDate ? <span className="soft-chip">{formatDateOnly(answer.eventDate)}</span> : null}
              </div>

              <h3 className="mt-4 text-base font-semibold leading-7 text-white sm:text-lg">{answer.prompt}</h3>

              <div className="mt-4 grid gap-2">
                {answer.options.map((option, optionIndex) => {
                  const optionId = option._id.toString();
                  const isSelected = selectedIds.includes(optionId);
                  const isCorrect = correctIds.includes(optionId);

                  return (
                    <div
                      key={option._id}
                      className={`rounded-[20px] border px-4 py-3 ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-500/12 text-white"
                          : isSelected
                            ? "border-neutral-400/40 bg-white/8 text-white"
                            : "border-white/8 bg-black/25 text-neutral-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-xs font-semibold">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <p className="text-sm leading-6">{option.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Your Answer</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-200">{userAnswerText}</p>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Correct Answer</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-200">{correctAnswerText}</p>
                </div>
              </div>

              {answer.explanation || answer.eventDate || answer.sourceTitle ? (
                <div className="mt-3 rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Review Notes</p>
                  {answer.explanation ? <p className="mt-2 text-sm leading-6 text-neutral-200">{answer.explanation}</p> : null}
                  {answer.eventDate ? (
                    <p className="mt-2 text-sm leading-6 text-neutral-300">Exact event date: {formatDateOnly(answer.eventDate)}</p>
                  ) : null}
                  {answer.sourceTitle ? (
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      Source: {answer.sourceUrl ? <a href={answer.sourceUrl} target="_blank" rel="noreferrer" className="underline">{answer.sourceTitle}</a> : answer.sourceTitle}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
