import { useState } from "react";

export const useApi = (requestFn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (...args) => {
    setLoading(true);
    setError("");

    try {
      return await requestFn(...args);
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || "Something went wrong";
      setError(message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  return { run, loading, error, setError };
};
