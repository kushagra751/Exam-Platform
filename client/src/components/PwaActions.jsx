import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { isStandaloneMode } from "../utils/pwa";
import { hasReminderPermission, requestReminderPermission } from "../utils/notificationReminders";

const IconButtonContent = ({ type, label }) => {
  if (type === "install") {
    return (
      <>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v10" strokeLinecap="round" />
          <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19h14" strokeLinecap="round" />
        </svg>
        <span className="sr-only">{label}</span>
      </>
    );
  }

  return (
    <>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </>
  );
};

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
        <Button
          variant="secondary"
          className="flex min-h-[40px] w-[40px] items-center justify-center rounded-full px-0 py-0"
          onClick={installApp}
          title={installed ? "Installed" : "Install app"}
        >
          <IconButtonContent type="install" label={installed ? "Installed" : "Install app"} />
        </Button>
        <Button
          variant="secondary"
          className="flex min-h-[40px] w-[40px] items-center justify-center rounded-full px-0 py-0"
          onClick={enableNotifications}
          title={notificationsEnabled ? "Alerts on" : "Enable alerts"}
        >
          <IconButtonContent type="alert" label={notificationsEnabled ? "Alerts on" : "Enable alerts"} />
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
