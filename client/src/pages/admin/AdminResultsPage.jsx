import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";

export const AdminResultsPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/results/all");
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
        { label: "Submissions", value: 0 },
        { label: "Avg. Score", value: 0 },
        { label: "Avg. %", value: "0%" }
      ];
    }

    const avgScore = (results.reduce((total, result) => total + result.score, 0) / results.length).toFixed(1);
    const avgPercentage = (
      results.reduce((total, result) => total + Number(result.percentage || 0), 0) / results.length
    ).toFixed(1);

    return [
      { label: "Submissions", value: results.length },
      { label: "Avg. Score", value: avgScore },
      { label: "Avg. %", value: `${avgPercentage}%` }
    ];
  }, [results]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">Results Review</p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Submission tracking with better readability</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Scan performance, fullscreen behavior, and tab-switching data from a clearer admin results surface.
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

      <Card className="rounded-[32px] p-6 sm:p-7">
        {loading ? (
          <Loader label="Loading results..." />
        ) : results.length ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:hidden">
              {results.map((result) => (
                <div key={result._id} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">{result.user?.name}</h3>
                      <p className="mt-1 text-sm text-muted">{result.exam?.title}</p>
                    </div>
                    <span className="soft-chip">Attempt {result.attemptNumber}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-muted">
                    <div className="metric-tile">
                      <p>Score</p>
                      <p className="mt-1 text-lg font-semibold text-white">{result.score}</p>
                    </div>
                    <div className="metric-tile">
                      <p>Percentage</p>
                      <p className="mt-1 text-lg font-semibold text-white">{result.percentage}%</p>
                    </div>
                    <div className="metric-tile">
                      <p>Correct</p>
                      <p className="mt-1 text-lg font-semibold text-white">{result.correctCount}</p>
                    </div>
                    <div className="metric-tile">
                      <p>Incorrect</p>
                      <p className="mt-1 text-lg font-semibold text-white">{result.incorrectCount}</p>
                    </div>
                    <div className="metric-tile">
                      <p>Tab Switches</p>
                      <p className="mt-1 text-lg font-semibold text-white">{result.tabSwitchCount}</p>
                    </div>
                    <div className="metric-tile">
                      <p>FS Enter / Exit</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {result.fullscreenEnterCount ?? 0} / {result.fullscreenExitCount ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.25em] text-muted">
                    <th>Name</th>
                    <th>Exam</th>
                    <th>Attempt</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Incorrect</th>
                    <th>Percentage</th>
                    <th>Tab Switches</th>
                    <th>FS Enter</th>
                    <th>FS Exit</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result._id} className="rounded-[24px] bg-white/[0.03] text-sm">
                      <td className="rounded-l-[24px] px-4 py-4 text-white">{result.user?.name}</td>
                      <td className="px-4 py-4">{result.exam?.title}</td>
                      <td className="px-4 py-4">{result.attemptNumber}</td>
                      <td className="px-4 py-4">{result.score}</td>
                      <td className="px-4 py-4">{result.correctCount}</td>
                      <td className="px-4 py-4">{result.incorrectCount}</td>
                      <td className="px-4 py-4">{result.percentage}%</td>
                      <td className="px-4 py-4">{result.tabSwitchCount}</td>
                      <td className="px-4 py-4">{result.fullscreenEnterCount ?? 0}</td>
                      <td className="rounded-r-[24px] px-4 py-4">{result.fullscreenExitCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No submissions yet" description="Published exam results will appear here." />
        )}
      </Card>
    </div>
  );
};
