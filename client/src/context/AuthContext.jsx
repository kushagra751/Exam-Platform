import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { isFirebaseConfigured, loadFirebaseRuntime } from "../lib/firebase";

const AuthContext = createContext(null);

const storageKey = "exam-platform-auth";
const googleRoleKey = "exam-platform-google-role";

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    localStorage.removeItem(storageKey);
    return null;
  }
};

const persistAuth = (value) => {
  if (value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } else {
    localStorage.removeItem(storageKey);
  }
};

const exchangeGoogleSession = async (firebaseUser, role = "user") => {
  const idToken = await firebaseUser.getIdToken(true);
  const { data } = await api.post("/auth/firebase", { idToken, role });
  return data;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState("");

  useEffect(() => {
    persistAuth(auth);
  }, [auth]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (auth?.token) {
          const { data } = await api.get("/auth/me");
          setAuth((prev) => ({ ...prev, ...data, token: prev.token }));
        }
      } catch (error) {
        setAuth(null);
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const finishGoogleRedirect = async () => {
      if (!isFirebaseConfigured) {
        return;
      }

      setGoogleAuthLoading(true);

      try {
        const runtime = await loadFirebaseRuntime();

        if (!runtime) {
          return;
        }

        await runtime.setPersistence(runtime.auth, runtime.browserLocalPersistence);

        const redirectResult = await runtime.getRedirectResult(runtime.auth);
        const firebaseUser = redirectResult?.user || runtime.auth.currentUser;

        if (!firebaseUser) {
          return;
        }

        const selectedRole = localStorage.getItem(googleRoleKey) || "user";
        const data = await exchangeGoogleSession(firebaseUser, selectedRole);
        localStorage.removeItem(googleRoleKey);
        setGoogleAuthError("");
        setAuth(data);
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || "Unable to continue with Google";
        setGoogleAuthError(message);
      } finally {
        setGoogleAuthLoading(false);
      }
    };

    finishGoogleRedirect();
  }, []);

  const login = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", payload);
      setAuth(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", payload);
      setAuth(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (role = "user") => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase authentication is not configured");
    }

    setGoogleAuthError("");
    setGoogleAuthLoading(true);

    try {
      const runtime = await loadFirebaseRuntime();

      if (!runtime) {
        throw new Error("Firebase authentication is not configured");
      }

      await runtime.setPersistence(runtime.auth, runtime.browserLocalPersistence);

      const provider = new runtime.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      localStorage.setItem(googleRoleKey, role);

      try {
        const popupResult = await runtime.signInWithPopup(runtime.auth, provider);
        const data = await exchangeGoogleSession(popupResult.user, role);
        localStorage.removeItem(googleRoleKey);
        setAuth(data);
        return data;
      } catch (popupError) {
        const message = popupError?.message || "";
        const shouldFallbackToRedirect =
          message.includes("popup") ||
          popupError?.code === "auth/popup-blocked" ||
          popupError?.code === "auth/cancelled-popup-request" ||
          popupError?.code === "auth/web-storage-unsupported";

        if (!shouldFallbackToRedirect) {
          throw popupError;
        }

        await runtime.signInWithRedirect(runtime.auth, provider);
        return null;
      }
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Unable to continue with Google";
      setGoogleAuthError(message);
      throw new Error(message);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const clearGoogleAuthError = () => setGoogleAuthError("");

  const logout = async () => {
    if (isFirebaseConfigured) {
      const runtime = await loadFirebaseRuntime().catch(() => null);

      if (runtime?.auth?.currentUser) {
        await runtime.signOut(runtime.auth).catch(() => undefined);
      }
    }

    localStorage.removeItem(googleRoleKey);
    setAuth(null);
    setGoogleAuthError("");
  };

  const value = useMemo(
    () => ({
      auth,
      user: auth,
      isAuthenticated: Boolean(auth?.token),
      loading,
      bootstrapping,
      isFirebaseConfigured,
      googleAuthLoading,
      googleAuthError,
      clearGoogleAuthError,
      login,
      register,
      loginWithGoogle,
      logout
    }),
    [auth, bootstrapping, googleAuthError, googleAuthLoading, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
