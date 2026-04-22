import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { isFirebaseConfigured, loadFirebaseAuthRuntime } from "../lib/firebase";

const AuthContext = createContext(null);

const storageKey = "exam-platform-auth";
const firebaseRoleKey = "exam-platform-firebase-role";

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
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);

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
          setAuth(data);
        }
      } catch (error) {
        // Redirect auth failures are surfaced later through explicit login actions.
      }
    };

    syncRedirectResult();
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

    setLoading(true);

    try {
      const firebaseRuntime = await loadFirebaseAuthRuntime();

      if (!firebaseRuntime) {
        throw new Error("Firebase authentication is not configured");
      }

      const provider = new firebaseRuntime.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const isMobile = window.matchMedia("(max-width: 768px)").matches;

      if (isMobile) {
        sessionStorage.setItem(firebaseRoleKey, role);
        await firebaseRuntime.signInWithRedirect(firebaseRuntime.auth, provider);
        return null;
      }

      const result = await firebaseRuntime.signInWithPopup(firebaseRuntime.auth, provider);
      const data = await exchangeFirebaseSession(result.user, role);
      setAuth(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneOtp = async (phoneNumber, containerId = "phone-recaptcha") => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase authentication is not configured");
    }

    setLoading(true);

    try {
      const firebaseRuntime = await loadFirebaseAuthRuntime();

      if (!firebaseRuntime) {
        throw new Error("Firebase authentication is not configured");
      }

      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      window.recaptchaVerifier = new firebaseRuntime.RecaptchaVerifier(firebaseRuntime.auth, containerId, {
        size: "invisible"
      });

      const confirmation = await firebaseRuntime.signInWithPhoneNumber(
        firebaseRuntime.auth,
        phoneNumber,
        window.recaptchaVerifier
      );
      setPhoneConfirmation(confirmation);
      return confirmation;
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async (code, role = "user") => {
    if (!phoneConfirmation) {
      throw new Error("Request an OTP before verifying");
    }

    setLoading(true);

    try {
      const credentialResult = await phoneConfirmation.confirm(code);
      const data = await exchangeFirebaseSession(credentialResult.user, role);
      setAuth(data);
      setPhoneConfirmation(null);
      return data;
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

    setPhoneConfirmation(null);
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
        phoneConfirmation,
        isFirebaseConfigured,
        login,
        register,
        loginWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
