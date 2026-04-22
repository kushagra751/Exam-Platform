import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);
const storageKey = "exam-platform-auth";

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

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    persistAuth(auth);
  }, [auth]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!auth?.token) {
        setBootstrapping(false);
        return;
      }

      try {
        const { data } = await api.get("/auth/me");
        setAuth((prev) => ({ ...prev, ...data, token: prev.token }));
      } catch (error) {
        setAuth(null);
      } finally {
        setBootstrapping(false);
      }
    };

    bootstrap();
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

  const logout = () => {
    setAuth(null);
  };

  const value = useMemo(
    () => ({
      auth,
      user: auth,
      isAuthenticated: Boolean(auth?.token),
      loading,
      bootstrapping,
      login,
      register,
      logout
    }),
    [auth, bootstrapping, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
