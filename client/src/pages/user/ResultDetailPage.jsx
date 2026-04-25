import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

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
      { label: "Score", value: result.score, hint: "final marks" },
      { label: "Correct", value: result.correctCount, hint: "right answers" },
      { label: "Incorrect", value: result.incorrectCount, hint: "wrong answers" },
      { label: "Percentage", value: `${result.percentage}%`, hint: "overall result" }
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
    <div className="page-shell mx-auto max-w-6xl space-y-5">
      <Card className="overflow-hidden rounded-[32px] p-0">
        <div className="relative overflow-hidden px-5 py-6 sm:px-6 sm:py-7">
          <div className="ambient-orb -left-10 -top-10" />
          <div className="ambient-orb-right -right-6 top-4" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker">Result Summary</p>
              <h1 className="mt-5 text-2xl font-semibold text-white sm:text-3xl">{result.exam.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                Detailed performance snapshot with score quality, time behavior, and question-by-question review.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="block">
                <Button variant="secondary" className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">{item.label}</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">{item.value}</h2>
                <p className="mt-1 text-xs text-muted">{item.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {result.analyzer ? (
        <Card className="rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Exam Analyzer</p>
              <h2 className="mt-5 text-2xl font-semibold text-white">Performance breakdown</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Speed, accuracy, attempt discipline, and pressure points from this attempt.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-neutral-200">
              Score efficiency: <span className="font-semibold text-white">{result.analyzer.scoreEfficiency}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              { label: "Accuracy", value: `${result.analyzer.accuracy}%` },
              { label: "Attempt Rate", value: `${result.analyzer.attemptedRate}%` },
              { label: "Skip Rate", value: `${result.analyzer.skipRate}%` },
              { label: "Avg Time / Q", value: `${result.analyzer.avgSecondsPerQuestion}s` },
              { label: "Tracked Time", value: `${result.analyzer.totalTrackedSeconds}s` },
              { label: "Exam Minutes", value: `${result.analyzer.durationMinutes}m` }
            ].map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{item.label}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{item.value}</h3>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-muted">Slowest Questions</p>
              <div className="mt-4 space-y-3">
                {result.analyzer.slowestQuestions.length ? (
                  result.analyzer.slowestQuestions.map((item) => (
                    <div key={`${item.questionNumber}-${item.timeSpentSeconds}`} className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">Q{item.questionNumber}</span>
                        <span className="soft-chip">{item.timeSpentSeconds}s</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">{item.status}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No time data available</p>
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-muted">Fastest Questions</p>
              <div className="mt-4 space-y-3">
                {result.analyzer.fastestQuestions.length ? (
                  result.analyzer.fastestQuestions.map((item) => (
                    <div key={`${item.questionNumber}-${item.timeSpentSeconds}`} className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">Q{item.questionNumber}</span>
                        <span className="soft-chip">{item.timeSpentSeconds}s</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">{item.status}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No fast-response data available</p>
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-muted">Revisit Questions</p>
              <div className="mt-4 space-y-3">
                {result.analyzer.reviewQuestionNumbers.length ? (
                  result.analyzer.reviewQuestionNumbers.map((item) => (
                    <div key={item.questionNumber} className="rounded-2xl border border-white/8 bg-black/30 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">Q{item.questionNumber}</span>
                        <span className="soft-chip">{item.timeSpentSeconds}s</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">{item.marksImpact} marks at risk</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No risky wrong answers in this attempt</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/8 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Recommendations</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.analyzer.recommendations.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-neutral-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {result.detailedAnswers.map((answer, index) => {
          const selectedIds = answer.selectedOptionIds.map((id) => id.toString());
          const correctIds = answer.correctOptionIds.map((id) => id.toString());
          const tone = getAnswerTone(answer);

          return (
            <Card key={answer.questionId} className={`rounded-[30px] border ${tone.container} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="soft-chip">Question {index + 1}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.text} bg-black/25`}>
                      {tone.badge}
                    </span>
                    <span className="soft-chip">{answer.obtainedMarks} marks</span>
                    <span className="soft-chip">{answer.timeSpentSeconds || 0}s</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold leading-8 text-white sm:text-xl">{answer.prompt}</h3>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[260px]">
                  <div className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3">
                    <p className="uppercase tracking-[0.18em] text-muted">Status</p>
                    <p className="mt-2 font-semibold text-white">{tone.badge}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3">
                    <p className="uppercase tracking-[0.18em] text-muted">Marks</p>
                    <p className="mt-2 font-semibold text-white">{answer.obtainedMarks}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/25 px-3 py-3">
                    <p className="uppercase tracking-[0.18em] text-muted">Time</p>
                    <p className="mt-2 font-semibold text-white">{answer.timeSpentSeconds || 0}s</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {answer.options.map((option, optionIndex) => {
                  const optionId = option._id.toString();
                  const isSelected = selectedIds.includes(optionId);
                  const isCorrect = correctIds.includes(optionId);

                  return (
                    <div
                      key={option._id}
                      className={`rounded-[22px] border px-4 py-4 ${
                        isCorrect
                          ? "border-emerald-300 bg-emerald-500/12 text-white"
                          : isSelected
                            ? "border-neutral-400/40 bg-white/8 text-white"
                            : "border-white/8 bg-black/25 text-neutral-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-xs font-semibold">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm leading-6">{option.text}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {isCorrect ? <span className="soft-chip bg-emerald-500/12 text-emerald-100">Correct option</span> : null}
                            {isSelected ? <span className="soft-chip bg-white/10 text-white">Your selection</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div
                  className={`rounded-[22px] border px-4 py-4 ${
                    answer.isSkipped ? "border-amber-300 bg-amber-500/12 text-white" : "border-white/8 bg-black/20 text-muted"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 text-xs font-semibold">
                      E
                    </span>
                    <div>
                      <p className="text-sm font-medium">5th option: no negative mark and counted as not attempted</p>
                      <p className="mt-1 text-xs text-muted">Use this when the question should be left safely without penalty.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone.text} bg-black/25`}>
                  {answer.isSkipped ? "Not attempted without penalty" : answer.isCorrect ? "Correct answer" : "Incorrect answer"}
                </span>
                {answer.explanation ? <span className="soft-chip">Explanation available</span> : null}
              </div>

              {answer.explanation ? (
                <div className="mt-4 rounded-[22px] border border-white/8 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted">Explanation</p>
                  <p className="mt-3 text-sm leading-7 text-neutral-200">{answer.explanation}</p>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
