import { notifyThroughServiceWorker } from "./pwa";

const permissionKey = "exam-platform-notification-enabled";
const reminderKey = "exam-platform-reminders";
let scheduledTimers = [];

const readReminders = () => {
  try {
    return JSON.parse(localStorage.getItem(reminderKey) || "[]");
  } catch (error) {
    localStorage.removeItem(reminderKey);
    return [];
  }
};

const writeReminders = (reminders) => {
  localStorage.setItem(reminderKey, JSON.stringify(reminders));
};

export const hasReminderPermission = () =>
  Notification.permission === "granted" && localStorage.getItem(permissionKey) === "true";

export const requestReminderPermission = async () => {
  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    localStorage.setItem(permissionKey, "true");
    return true;
  }

  localStorage.removeItem(permissionKey);
  return false;
};

const clearScheduledTimers = () => {
  scheduledTimers.forEach((timerId) => window.clearTimeout(timerId));
  scheduledTimers = [];
};

const removeReminder = (id) => {
  const reminders = readReminders().filter((item) => item.id !== id);
  writeReminders(reminders);
};

const dispatchReminder = async (reminder) => {
  await notifyThroughServiceWorker({
    title: reminder.title,
    options: {
      body: reminder.body,
      icon: "/icon-192.svg",
      badge: "/icon-192.svg",
      tag: reminder.id
    }
  });

  if (Notification.permission === "granted") {
    new Notification(reminder.title, {
      body: reminder.body,
      icon: "/icon-192.svg",
      tag: reminder.id
    });
  }

  removeReminder(reminder.id);
};

export const scheduleStoredReminders = () => {
  clearScheduledTimers();

  readReminders().forEach((reminder) => {
    const delay = new Date(reminder.triggerAt).getTime() - Date.now();

    if (delay <= 0) {
      dispatchReminder(reminder).catch(() => undefined);
      return;
    }

    const timerId = window.setTimeout(() => {
      dispatchReminder(reminder).catch(() => undefined);
    }, delay);

    scheduledTimers.push(timerId);
  });
};

export const createExamReminder = (exam) => {
  const startAt = new Date(exam.startTime).getTime();
  const tenMinutesBefore = startAt - 10 * 60 * 1000;
  const triggerAt = tenMinutesBefore > Date.now() ? tenMinutesBefore : Math.max(Date.now() + 5000, startAt);

  const reminder = {
    id: `exam-${exam._id}`,
    examId: exam._id,
    title: `Upcoming exam: ${exam.title}`,
    body: `${exam.title} is coming up. Open Exam Platform and get ready to start on time.`,
    triggerAt: new Date(triggerAt).toISOString()
  };

  const reminders = readReminders().filter((item) => item.id !== reminder.id);
  reminders.push(reminder);
  writeReminders(reminders);
  scheduleStoredReminders();
  return reminder;
};

export const hasExamReminder = (examId) => readReminders().some((item) => item.examId === examId);
