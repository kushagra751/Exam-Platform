export const formatDateTime = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });

export const formatDuration = (minutes) => `${minutes} min`;
export const formatDateOnly = (value) =>
  value
    ? new Date(value).toLocaleDateString([], {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : "-";

export const formatNegativeMarking = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  if (numeric === 0) {
    return "0";
  }

  for (let denominator = 1; denominator <= 12; denominator += 1) {
    const numerator = Math.round(numeric * denominator);
    if (numerator > 0 && Math.abs(numerator / denominator - numeric) < 0.0001) {
      return `${numerator}/${denominator}`;
    }
  }

  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/\.?0+$/, "");
};

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
