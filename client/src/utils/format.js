export const formatDateTime = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });

export const formatDuration = (minutes) => `${minutes} min`;

export const getExamState = (exam) => {
  const now = Date.now();
  const start = new Date(exam.startTime).getTime();
  const end = new Date(exam.endTime).getTime();

  if (now < start) {
    return "upcoming";
  }

  if (now > end) {
    return "closed";
  }

  return "live";
};

export const getTimeRemainingInSeconds = (startedAt, duration) => {
  const start = new Date(startedAt).getTime();
  const end = start + duration * 60 * 1000;
  return Math.max(0, Math.floor((end - Date.now()) / 1000));
};

export const formatCountdown = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
};
