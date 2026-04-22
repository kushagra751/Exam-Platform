import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

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
    <div className="page-shell mx-auto max-w-5xl space-y-5">
      <Card className="rounded-[28px] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Result Summary</p>
            <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">{result.exam.title}</h1>
          </div>
          <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="block">
            <Button variant="secondary" className="w-full sm:w-auto">
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[
            { label: "Score", value: result.score },
            { label: "Correct", value: result.correctCount },
            { label: "Incorrect", value: result.incorrectCount },
            { label: "Percentage", value: `${result.percentage}%` }
          ].map((item) => (
            <div key={item.label} className="metric-tile">
              <p className="text-sm text-muted">{item.label}</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{item.value}</h2>
            </div>
          ))}
        </div>

        {Array.isArray(result.sectionScores) && result.sectionScores.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {result.sectionScores.map((section) => (
              <div key={section.title} className="metric-tile">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">{section.title}</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {section.score} / cutoff {section.cutoffMarks}
                </p>
                <p className={`mt-1 text-sm ${section.passedCutoff ? "text-emerald-200" : "text-rose-200"}`}>
                  {section.passedCutoff ? "Passed cutoff" : "Below cutoff"}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {result.detailedAnswers.map((answer, index) => {
        const selectedIds = answer.selectedOptionIds.map((id) => id.toString());
        const correctIds = answer.correctOptionIds.map((id) => id.toString());

        return (
          <Card key={answer.questionId} className="rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-muted">Question {index + 1}</p>
            <h3 className="mt-3 text-lg font-semibold text-white sm:text-xl">{answer.prompt}</h3>

            <div className="mt-5 space-y-3">
              {answer.options.map((option) => {
                const optionId = option._id.toString();
                const isSelected = selectedIds.includes(optionId);
                const isCorrect = correctIds.includes(optionId);

                return (
                  <div
                    key={option._id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isCorrect
                        ? "border-emerald-300 bg-emerald-500/12 text-white"
                        : isSelected
                          ? "border-neutral-500 bg-neutral-800 text-white"
                          : "border-border bg-surface text-white"
                    }`}
                  >
                    {option.text}
                  </div>
                );
              })}

              {answer.enableSkipOption ? (
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    answer.isSkipped ? "border-amber-300 bg-amber-500/12 text-white" : "border-border bg-surface text-muted"
                  }`}
                >
                  Skip without negative marking
                </div>
              ) : null}
            </div>

            <p className="mt-4 text-sm text-muted">
              {answer.isSkipped ? "Skipped without penalty" : answer.isCorrect ? "Correct answer" : "Incorrect answer"} | Marks: {answer.obtainedMarks}
            </p>
            {answer.explanation ? <p className="mt-2 text-sm text-muted">Explanation: {answer.explanation}</p> : null}
          </Card>
        );
      })}
    </div>
  );
};
