export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch (error) {
    return null;
  }
};

export const isStandaloneMode = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;

export const notifyThroughServiceWorker = async (payload) => {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration?.active) {
    return false;
  }

  registration.active.postMessage({
    type: "SHOW_NOTIFICATION",
    payload
  });

  return true;
};

export const shareExamLink = async ({ title, text, url }) => {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return "shared";
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  window.prompt("Copy this exam link", url);
  return "prompted";
};
