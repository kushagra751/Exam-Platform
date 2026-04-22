import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";

export const ResultDetailPage = () => {
  const { resultId } = useParams();
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
    <div className="page-shell mx-auto max-w-6xl space-y-6">
      <Card>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{result.exam.title}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            { label: "Score", value: result.score },
            { label: "Correct", value: result.correctCount },
            { label: "Incorrect", value: result.incorrectCount },
            { label: "Percentage", value: `${result.percentage}%` }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-sm text-muted">{item.label}</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{item.value}</h2>
            </div>
          ))}
        </div>
      </Card>

      {result.detailedAnswers.map((answer, index) => {
        const selectedIds = answer.selectedOptionIds.map((id) => id.toString());
        const correctIds = answer.correctOptionIds.map((id) => id.toString());

        return (
          <Card key={answer.questionId}>
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
                        ? "border-white bg-white text-black"
                        : isSelected
                          ? "border-neutral-500 bg-neutral-800 text-white"
                          : "border-border bg-surface text-white"
                    }`}
                  >
                    {option.text}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted">
              {answer.isCorrect ? "Correct answer" : "Incorrect answer"} | Marks: {answer.obtainedMarks}
            </p>
            {answer.explanation ? <p className="mt-2 text-sm text-muted">Explanation: {answer.explanation}</p> : null}
          </Card>
        );
      })}
    </div>
  );
};
