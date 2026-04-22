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

let firebaseRuntimePromise = null;

export const loadFirebaseRuntime = async () => {
  if (!isFirebaseConfigured) {
    return null;
  }

  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/analytics")
    ]).then(async ([appModule, authModule, analyticsModule]) => {
      const app = appModule.initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);

      if (typeof window !== "undefined" && firebaseConfig.measurementId) {
        try {
          const supported = await analyticsModule.isSupported();

          if (supported) {
            analyticsModule.getAnalytics(app);
          }
        } catch (error) {
          // Analytics is optional for auth flow.
        }
      }

      return {
        app,
        auth,
        GoogleAuthProvider: authModule.GoogleAuthProvider,
        signInWithPopup: authModule.signInWithPopup,
        signInWithRedirect: authModule.signInWithRedirect,
        getRedirectResult: authModule.getRedirectResult,
        browserLocalPersistence: authModule.browserLocalPersistence,
        setPersistence: authModule.setPersistence,
        signOut: authModule.signOut
      };
    });
  }

  return firebaseRuntimePromise;
};
