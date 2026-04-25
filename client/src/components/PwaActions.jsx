import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { isStandaloneMode } from "../utils/pwa";
import { hasReminderPermission, requestReminderPermission } from "../utils/notificationReminders";

const getInstallFallback = () => {
  const userAgent = navigator.userAgent || "";

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iPhone/iPad par browser menu kholkar Add to Home Screen use karo.";
  }

  if (/android/i.test(userAgent)) {
    return "Android browser menu me Add to Home Screen ya Install App option use karo.";
  }

  return "Is browser me install prompt available nahi hai. Browser menu se install/add to home screen use karo.";
};

export const PwaActions = ({ compact = false }) => {
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
      setMessage("App install ho gaya. Ab home screen se direct open kar sakte ho.");
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
      setMessage(getInstallFallback());
      return;
    }

    await installEvent.prompt();
    setMessage("Install prompt open ho gaya. Browser prompt accept karo.");
    setInstallEvent(null);
  };

  const enableNotifications = async () => {
    try {
      const granted = await requestReminderPermission();
      setNotificationsEnabled(granted);
      setMessage(granted ? "Exam reminders enable ho gaye." : "Notification permission allow nahi hui.");
    } catch (error) {
      setMessage(error.message || "Notifications enable nahi ho paayi.");
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="min-h-[42px] rounded-full px-3 py-2 text-xs" onClick={installApp}>
          {installed ? "Installed" : "Install"}
        </Button>
        <Button variant="secondary" className="min-h-[42px] rounded-full px-3 py-2 text-xs" onClick={enableNotifications}>
          {notificationsEnabled ? "Alerts On" : "Alerts"}
        </Button>
        {message ? <p className="hidden text-xs text-neutral-300 lg:block">{message}</p> : null}
      </div>
    );
  }

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
