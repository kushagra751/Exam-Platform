import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { isFirebaseConfigured, loadFirebaseAuthRuntime } from "../lib/firebase";

const AuthContext = createContext(null);

const storageKey = "exam-platform-auth";
const firebaseRoleKey = "exam-platform-firebase-role";
const firebaseRedirectErrorKey = "exam-platform-firebase-redirect-error";

const persistAuth = (value) => {
  if (value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } else {
    localStorage.removeItem(storageKey);
  }
};

const normalizeStoredAuth = () => {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    localStorage.removeItem(storageKey);
    return null;
  }
};

const exchangeFirebaseSession = async (firebaseUser, role = "user") => {
  const idToken = await firebaseUser.getIdToken();
  const { data } = await api.post("/auth/firebase", { idToken, role });
  return data;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(normalizeStoredAuth);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [firebaseRedirectError, setFirebaseRedirectError] = useState(
    () => sessionStorage.getItem(firebaseRedirectErrorKey) || ""
  );

  useEffect(() => {
    persistAuth(auth);
  }, [auth]);

  useEffect(() => {
    const syncCurrentUser = async () => {
      if (!auth?.token) {
        setBootstrapping(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setAuth((prev) => ({
          ...prev,
          ...data,
          token: prev.token
        }));
      } catch (error) {
        setAuth(null);
      } finally {
        setBootstrapping(false);
      }
    };

    syncCurrentUser();
  }, []);

  useEffect(() => {
    const syncRedirectResult = async () => {
      if (!isFirebaseConfigured) {
        return;
      }

      try {
        const firebaseRuntime = await loadFirebaseAuthRuntime();

        if (!firebaseRuntime) {
          return;
        }

        const redirectResult = await firebaseRuntime.getRedirectResult(firebaseRuntime.auth);

        if (redirectResult?.user) {
          const intendedRole = sessionStorage.getItem(firebaseRoleKey) || "user";
          const data = await exchangeFirebaseSession(redirectResult.user, intendedRole);
          sessionStorage.removeItem(firebaseRoleKey);
          sessionStorage.removeItem(firebaseRedirectErrorKey);
          setFirebaseRedirectError("");
          setAuth(data);
          window.location.replace(data.role === "admin" ? "/admin" : "/dashboard");
        }
      } catch (error) {
        const message = error?.response?.data?.message || error?.message || "Unable to continue with Google";
        sessionStorage.setItem(firebaseRedirectErrorKey, message);
        setFirebaseRedirectError(message);
      }
    };

    syncRedirectResult();
  }, []);

  const clearFirebaseRedirectError = () => {
    sessionStorage.removeItem(firebaseRedirectErrorKey);
    setFirebaseRedirectError("");
  };

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

    setLoading(true);

    try {
      const firebaseRuntime = await loadFirebaseAuthRuntime();

      if (!firebaseRuntime) {
        throw new Error("Firebase authentication is not configured");
      }

      const provider = new firebaseRuntime.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      sessionStorage.setItem(firebaseRoleKey, role);
      await firebaseRuntime.signInWithRedirect(firebaseRuntime.auth, provider);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured) {
      const firebaseRuntime = await loadFirebaseAuthRuntime().catch(() => null);

      if (firebaseRuntime?.auth?.currentUser) {
        await firebaseRuntime.signOut(firebaseRuntime.auth).catch(() => undefined);
      }
    }

    setAuth(null);
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        user: auth,
        isAuthenticated: Boolean(auth?.token),
        loading,
        bootstrapping,
        isFirebaseConfigured,
        firebaseRedirectError,
        clearFirebaseRedirectError,
        login,
        register,
        loginWithGoogle,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
