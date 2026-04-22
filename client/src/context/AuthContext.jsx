import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem("exam-platform-auth");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      localStorage.removeItem("exam-platform-auth");
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (auth) {
      localStorage.setItem("exam-platform-auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("exam-platform-auth");
    }
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

  const logout = () => setAuth(null);

  return (
    <AuthContext.Provider
      value={{
        auth,
        user: auth,
        isAuthenticated: Boolean(auth?.token),
        loading,
        bootstrapping,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
