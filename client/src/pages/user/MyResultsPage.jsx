import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";

export const MyResultsPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/results/me");
        setResults(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    if (!results.length) {
      return [
        { label: "Attempts", value: 0 },
        { label: "Best Score", value: 0 },
        { label: "Best %", value: "0%" }
      ];
    }

    const bestScore = Math.max(...results.map((result) => result.score));
    const bestPercentage = Math.max(...results.map((result) => result.percentage));

    return [
      { label: "Attempts", value: results.length },
      { label: "Best Score", value: bestScore },
      { label: "Best %", value: `${bestPercentage}%` }
    ];
  }, [results]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">Results</p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Your performance, easier to review</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Open detailed analysis, compare attempts, and scan your results without digging through heavy tables.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            {stats.map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Loader label="Loading results..." />
      ) : results.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {results.map((result) => (
            <Card key={result._id} className="rounded-[32px] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-white">{result.exam?.title}</h3>
                  <p className="mt-3 text-sm text-muted">Attempt #{result.attemptNumber}</p>
                </div>
                <span className="soft-chip">{result.percentage}%</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-muted">
                <div className="metric-tile">
                  <p>Score</p>
                  <h4 className="mt-2 text-2xl font-semibold text-white">{result.score}</h4>
                </div>
                <div className="metric-tile">
                  <p>Percentage</p>
                  <h4 className="mt-2 text-2xl font-semibold text-white">{result.percentage}%</h4>
                </div>
                <div className="metric-tile">
                  <p>Correct</p>
                  <h4 className="mt-2 text-2xl font-semibold text-white">{result.correctCount}</h4>
                </div>
                <div className="metric-tile">
                  <p>Incorrect</p>
                  <h4 className="mt-2 text-2xl font-semibold text-white">{result.incorrectCount}</h4>
                </div>
              </div>

              <div className="mt-6">
                <Link to={`/results/${result._id}`} className="block">
                  <Button className="w-full sm:w-auto">View Detailed Result</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No completed exams" description="Your submitted results will appear here." />
      )}
    </div>
  );
};
