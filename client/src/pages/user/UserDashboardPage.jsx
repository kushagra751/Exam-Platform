import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Loader } from "../../components/ui/Loader";
import { Input } from "../../components/ui/Input";
import { getRequestErrorMessage } from "../../utils/errors";
import { formatDateTime, getExamState } from "../../utils/format";
import {
  createExamReminder,
  hasExamReminder,
  hasReminderPermission,
  requestReminderPermission
} from "../../utils/notificationReminders";
import { shareExamLink } from "../../utils/pwa";

export const UserDashboardPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [playlistFilter, setPlaylistFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [reminderMap, setReminderMap] = useState({});
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/exams/available");
        setExams(data);
        setReminderMap(
          data.reduce((accumulator, exam) => {
            accumulator[exam._id] = hasExamReminder(exam._id);
            return accumulator;
          }, {})
        );
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, "Unable to load available exams"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const subjects = useMemo(
    () => ["all", ...new Set(exams.map((exam) => exam.subject).filter(Boolean))],
    [exams]
  );
  const playlists = useMemo(
    () => ["all", ...new Set(exams.map((exam) => exam.playlist).filter(Boolean))],
    [exams]
  );

  const filteredExams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        !query ||
        [exam.title, exam.description, exam.subject, exam.topic, exam.playlist]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      const matchesSubject = subjectFilter === "all" || exam.subject === subjectFilter;
      const matchesPlaylist = playlistFilter === "all" || exam.playlist === playlistFilter;

      return matchesSearch && matchesSubject && matchesPlaylist;
    });
  }, [exams, playlistFilter, search, subjectFilter]);

  const remindForExam = async (exam) => {
    setMessage("");

    let granted = hasReminderPermission();
    if (!granted) {
      granted = await requestReminderPermission();
    }

    if (!granted) {
      setMessage("Browser reminder permission allow nahi hui.");
      return;
    }

    createExamReminder(exam);
    setReminderMap((prev) => ({ ...prev, [exam._id]: true }));
    setMessage(`Reminder set ho gaya for ${exam.title}.`);
  };

  const shareExam = async (exam) => {
    const outcome = await shareExamLink({
      title: exam.title,
      text: "Attempt this exam on Exam Platform",
      url: `${window.location.origin}/exam/${exam._id}/instructions`
    }).catch(() => "failed");

    if (outcome === "copied") {
      setMessage(`Share link copied for ${exam.title}.`);
    } else if (outcome === "shared") {
      setMessage(`Exam shared: ${exam.title}.`);
    } else {
      setMessage("Exam share nahi ho paaya.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-[26px] px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Published Exams</p>
            <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{filteredExams.length} exams ready</h2>
          </div>

          <button
            type="button"
            onClick={() => setShowSearch((prev) => !prev)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-base text-white"
          >
            ⌕
          </button>
        </div>

        {showSearch ? (
          <div className="mt-4">
            <Input
              label="Search exams"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, subject, topic"
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-sm text-muted">
            <span className="font-medium text-neutral-300">Subject</span>
            <select
              className="min-h-[46px] rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25 focus:bg-black/45"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === "all" ? "All" : subject}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-muted">
            <span className="font-medium text-neutral-300">Playlist</span>
            <select
              className="min-h-[46px] rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25 focus:bg-black/45"
              value={playlistFilter}
              onChange={(event) => setPlaylistFilter(event.target.value)}
            >
              {playlists.map((playlist) => (
                <option key={playlist} value={playlist}>
                  {playlist === "all" ? "All" : playlist}
                </option>
              ))}
            </select>
          </label>
        </div>

        {message ? <p className="mt-3 text-sm text-neutral-200">{message}</p> : null}
      </Card>

      {loading ? (
        <Loader label="Loading available exams..." />
      ) : error ? (
        <ErrorState title="Access Issue" description={error} />
      ) : filteredExams.length ? (
        <div className="grid gap-3">
          {filteredExams.map((exam) => {
            const state = getExamState(exam);
            const isLocked = exam.isLocked || (exam.lockedUntil && new Date(exam.lockedUntil) > new Date());

            return (
              <Card key={exam._id} className="rounded-[24px] px-4 py-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="soft-chip">{state}</span>
                    {exam.subject ? <span className="soft-chip">{exam.subject}</span> : null}
                    {exam.playlist ? <span className="soft-chip">{exam.playlist}</span> : null}
                    {isLocked ? <span className="soft-chip bg-amber-500/10 text-amber-200">Locked</span> : null}
                    {exam.hasActiveAttempt ? <span className="soft-chip bg-sky-500/10 text-sky-200">Resume</span> : null}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{exam.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{exam.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Duration</p>
                      <p className="mt-1 text-sm font-semibold text-white">{exam.duration}m</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Negative</p>
                      <p className="mt-1 text-sm font-semibold text-white">{exam.negativeMarking}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-2 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Starts</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white">{formatDateTime(exam.startTime)}</p>
                    </div>
                  </div>

                  {isLocked ? (
                    <p className="text-xs leading-5 text-amber-200">
                      {exam.lockedUntil
                        ? `Locked until ${formatDateTime(exam.lockedUntil)}`
                        : "This exam is currently locked by the admin."}
                    </p>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2">
                    <Link to={`/exam/${exam._id}/instructions`} className="block">
                      <Button className="w-full min-h-[44px] px-3 py-2 text-xs" disabled={isLocked}>
                        {isLocked ? "Locked" : exam.hasActiveAttempt ? "Resume" : "Open"}
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      className="w-full min-h-[44px] px-3 py-2 text-xs"
                      onClick={() => shareExam(exam)}
                    >
                      Share
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full min-h-[44px] px-3 py-2 text-xs"
                      onClick={() => remindForExam(exam)}
                    >
                      {reminderMap[exam._id] ? "Saved" : "Remind"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No matching exams" description="Try another subject, playlist, or search term." />
      )}
    </div>
  );
};
