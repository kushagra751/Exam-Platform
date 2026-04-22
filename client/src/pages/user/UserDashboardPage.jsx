import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loader } from "../../components/ui/Loader";
import { getRequestErrorMessage } from "../../utils/errors";
import { formatDateTime, getExamState } from "../../utils/format";

export const UserDashboardPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/exams/available");
        setExams(data);
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, "Unable to load available exams"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const live = exams.filter((exam) => getExamState(exam) === "live").length;
    const upcoming = exams.filter((exam) => getExamState(exam) === "upcoming").length;
    const avgDuration = exams.length
      ? Math.round(exams.reduce((total, exam) => total + exam.duration, 0) / exams.length)
      : 0;

    return [
      { label: "Live Exams", value: live || 0 },
      { label: "Upcoming", value: upcoming || 0 },
      { label: "Avg. Duration", value: `${avgDuration || 0} min` }
    ];
  }, [exams]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">Candidate View</p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Available exams, clearer at a glance</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Jump into active exams quickly, check schedules without clutter, and stay oriented with a cleaner card
              layout that works well on mobile too.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            {stats.map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Loader label="Loading available exams..." />
      ) : error ? (
        <ErrorState title="Access Issue" description={error} />
      ) : exams.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {exams.map((exam) => {
            const state = getExamState(exam);

            return (
              <Card key={exam._id} className="rounded-[32px] p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="soft-chip">{state}</span>
                    <h3 className="mt-4 text-2xl font-semibold text-white">{exam.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted">{exam.description}</p>
                  </div>

                  <div className="metric-tile min-w-[120px] self-start text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Duration</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{exam.duration}</p>
                    <p className="text-xs text-muted">minutes</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="metric-tile">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Total Marks</p>
                    <p className="mt-2 text-lg font-semibold text-white">{exam.totalMarks}</p>
                  </div>
                  <div className="metric-tile">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Negative Marking</p>
                    <p className="mt-2 text-lg font-semibold text-white">{exam.negativeMarking}</p>
                  </div>
                  <div className="metric-tile">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Starts</p>
                    <p className="mt-2 text-sm leading-6 text-white">{formatDateTime(exam.startTime)}</p>
                  </div>
                  <div className="metric-tile">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Ends</p>
                    <p className="mt-2 text-sm leading-6 text-white">{formatDateTime(exam.endTime)}</p>
                  </div>
                </div>

                <div className="glass-divider mt-6" />

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted">Open the instructions page to review rules before your attempt begins.</p>
                  <Link to={`/exam/${exam._id}/instructions`} className="block">
                    <Button className="w-full sm:w-auto">Start Exam</Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No live exams" description="Published exams become visible here during their active window." />
      )}
    </div>
  );
};
