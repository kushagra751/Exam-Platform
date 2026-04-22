export const getFullscreenElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement || null;

export const isFullscreenSupported = () =>
  typeof document !== "undefined" &&
  Boolean(document.documentElement?.requestFullscreen || document.documentElement?.webkitRequestFullscreen);

export const requestDocumentFullscreen = async () => {
  const element = document.documentElement;

  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
    return;
  }

  throw new Error("Fullscreen is not supported in this browser.");
};

export const exitDocumentFullscreen = async () => {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
    return;
  }

  throw new Error("Fullscreen exit is not supported in this browser.");
};
