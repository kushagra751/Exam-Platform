import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem("exam-platform-auth");

  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      if (parsed?.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch (error) {
      localStorage.removeItem("exam-platform-auth");
    }
  }

  return config;
});

export default api;
