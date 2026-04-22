import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loader } from "../../components/ui/Loader";
import { getRequestErrorMessage } from "../../utils/errors";
import { formatDateTime } from "../../utils/format";

export const AdminDashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/exams/analytics");
        setAnalytics(data);
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, "Unable to load admin dashboard"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return [
      { label: "Registered Users", value: analytics.totalUsers },
      { label: "Total Exams", value: analytics.totalExams },
      { label: "Submitted Results", value: analytics.totalResults }
    ];
  }, [analytics]);

  if (loading) {
    return <Loader label="Loading dashboard..." />;
  }

  if (error || !analytics) {
    return (
      <ErrorState
        title="Admin Access Required"
        description={error || "You do not have permission to view the admin dashboard."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">Admin Overview</p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Operate the platform with less noise</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              This view surfaces the most important platform numbers first, then brings recent exam activity into a
              cleaner review flow so you can move faster.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[460px]">
            {stats.map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[32px] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Recent Exams</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Latest scheduled activity</h3>
            </div>
            <span className="soft-chip">{analytics.recentExams.length} visible</span>
          </div>

          <div className="mt-6 space-y-4">
            {analytics.recentExams.map((exam) => (
              <div key={exam._id} className="rounded-[26px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold text-white">{exam.title}</h4>
                      <span className="soft-chip">{exam.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {exam.questions.length} questions | {exam.duration} minutes
                    </p>
                  </div>
                  <div className="metric-tile min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted">Start Time</p>
                    <p className="mt-2 text-sm leading-6 text-white">{formatDateTime(exam.startTime)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[32px] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Control Notes</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">What this workspace now emphasizes</h3>
          <div className="mt-6 space-y-4">
            {[
              "Cleaner hierarchy across admin pages so important actions stand out faster.",
              "Stronger exam surfaces and stat tiles to make data easier to scan.",
              "Mobile-friendly spacing and tap targets so the admin workflow still feels usable on phones."
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[24px] border border-white/8 bg-black/35 p-4">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-white shadow-soft" />
                <p className="text-sm leading-6 text-neutral-200">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
