import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { isStandaloneMode } from "../utils/pwa";
import { hasReminderPermission, requestReminderPermission } from "../utils/notificationReminders";

export const PwaActions = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandaloneMode());
  const [notificationsEnabled, setNotificationsEnabled] = useState(hasReminderPermission());
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setMessage("App installed. You can open it from your home screen now.");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installEvent) {
      setMessage("Open this site in a supported browser and use Add to Home Screen if the install button is unavailable.");
      return;
    }

    await installEvent.prompt();
    setInstallEvent(null);
  };

  const enableNotifications = async () => {
    try {
      const granted = await requestReminderPermission();
      setNotificationsEnabled(granted);
      setMessage(granted ? "Browser reminders enabled for upcoming exams." : "Notification permission was not granted.");
    } catch (error) {
      setMessage(error.message || "Unable to enable notifications on this browser.");
    }
  };

  return (
    <div className="rounded-[28px] border border-white/8 bg-black/35 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-muted">Mobile App Mode</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" className="w-full sm:w-auto" onClick={installApp}>
          {installed ? "Installed" : "Install App"}
        </Button>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={enableNotifications}>
          {notificationsEnabled ? "Notifications On" : "Enable Reminders"}
        </Button>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        Install the app for home-screen access and allow browser reminders for upcoming exams. True background push after the app is fully closed still needs a backend push service.
      </p>
      {message ? <p className="mt-3 text-sm text-neutral-200">{message}</p> : null}
    </div>
  );
};
