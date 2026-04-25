const queueKey = "exam-platform-offline-attempt-queue";

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(queueKey) || "[]");
  } catch (error) {
    localStorage.removeItem(queueKey);
    return [];
  }
};

const writeQueue = (items) => {
  localStorage.setItem(queueKey, JSON.stringify(items));
};

export const enqueueAttemptAction = (item) => {
  const queue = readQueue().filter(
    (queued) =>
      !(
        queued.kind === item.kind &&
        queued.resultId === item.resultId &&
        queued.questionId === item.questionId
      )
  );

  queue.push({
    ...item,
    queuedAt: new Date().toISOString()
  });

  writeQueue(queue);
  return queue.length;
};

export const getQueuedAttemptCount = () => readQueue().length;

export const flushAttemptQueue = async (api) => {
  const queue = readQueue();
  if (!queue.length) {
    return 0;
  }

  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    try {
      if (item.kind === "answer") {
        await api.put(`/exams/attempts/${item.resultId}/answer`, item.payload);
        synced += 1;
      } else {
        remaining.push(item);
      }
    } catch (error) {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return synced;
};
