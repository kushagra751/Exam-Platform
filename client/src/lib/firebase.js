const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredFirebaseKeys = ["apiKey", "authDomain", "projectId", "appId"];

export const isFirebaseConfigured = requiredFirebaseKeys.every((key) => Boolean(firebaseConfig[key]));

let firebaseAppPromise = null;
let firebaseAuthPromise = null;
let analyticsStarted = false;

const startAnalytics = async (app) => {
  if (analyticsStarted || typeof window === "undefined" || !firebaseConfig.measurementId) {
    return;
  }

  analyticsStarted = true;

  try {
    const analyticsModule = await import("firebase/analytics");
    const supported = await analyticsModule.isSupported();

    if (supported) {
      analyticsModule.getAnalytics(app);
    }
  } catch (error) {
    analyticsStarted = false;
  }
};

const getFirebaseApp = async () => {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (!firebaseAppPromise) {
    firebaseAppPromise = import("firebase/app").then(({ initializeApp }) => {
      const app = initializeApp(firebaseConfig);
      startAnalytics(app);
      return app;
    });
  }

  return firebaseAppPromise;
};

export const loadFirebaseAuthRuntime = async () => {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (!firebaseAuthPromise) {
    firebaseAuthPromise = Promise.all([getFirebaseApp(), import("firebase/auth")]).then(([app, authModule]) => ({
      app,
      auth: authModule.getAuth(app),
      GoogleAuthProvider: authModule.GoogleAuthProvider,
      RecaptchaVerifier: authModule.RecaptchaVerifier,
      signInWithPhoneNumber: authModule.signInWithPhoneNumber,
      signInWithPopup: authModule.signInWithPopup,
      signInWithRedirect: authModule.signInWithRedirect,
      getRedirectResult: authModule.getRedirectResult,
      signOut: authModule.signOut
    }));
  }

  return firebaseAuthPromise;
};
