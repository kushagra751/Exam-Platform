import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { getRequestErrorMessage } from "../../utils/errors";

export const LoginPage = () => {
  const navigate = useNavigate();
  const {
    login,
    loginWithGoogle,
    loading,
    isFirebaseConfigured,
    isAuthenticated,
    user,
    bootstrapping
  } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bootstrapping && isAuthenticated && user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [bootstrapping, isAuthenticated, navigate, user]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const data = await login(form);
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Unable to login"));
    }
  };

  const onGoogleLogin = async () => {
    setError("");

    try {
      await loginWithGoogle("user");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to sign in with Google"));
    }
  };

  return (
    <Card className="rounded-[32px] p-6 sm:p-7">
      <p className="section-kicker">Login</p>
      <h2 className="mt-5 text-3xl font-semibold text-white">Welcome back</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Sign in with email or Google and continue directly into the exam workspace.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
        {error ? <p className="rounded-2xl border border-red-200/20 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </Button>
      </form>

      {isFirebaseConfigured ? (
        <>
          <div className="my-6 glass-divider" />

          <div className="space-y-3">
            <Button variant="secondary" className="w-full" onClick={onGoogleLogin} disabled={loading}>
              Continue with Google
            </Button>
            <p className="text-sm text-muted">
              Google sign-in returns here once, then automatically sends you to your dashboard.
            </p>
          </div>
        </>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link to="/register" className="font-semibold text-white">
          Create an account
        </Link>
      </p>
    </Card>
  );
};
