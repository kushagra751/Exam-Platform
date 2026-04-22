import { useState } from "react";
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
    sendPhoneOtp,
    verifyPhoneOtp,
    loading,
    phoneConfirmation,
    isFirebaseConfigured
  } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

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
      const data = await loginWithGoogle("user");

      if (data) {
        navigate(data.role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to sign in with Google"));
    }
  };

  const onSendPhoneOtp = async () => {
    setError("");

    try {
      await sendPhoneOtp(phoneNumber);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to send OTP"));
    }
  };

  const onVerifyPhoneOtp = async () => {
    setError("");

    try {
      const data = await verifyPhoneOtp(otp, "user");
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to verify OTP"));
    }
  };

  return (
    <Card className="rounded-[32px] p-6 sm:p-7">
      <p className="section-kicker">Login</p>
      <h2 className="mt-5 text-3xl font-semibold text-white">Welcome back</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Sign in with email, Google, or phone number and continue directly into the exam workspace.
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

          <div className="space-y-4">
            <Button variant="secondary" className="w-full" onClick={onGoogleLogin} disabled={loading}>
              Continue with Google
            </Button>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Phone Login</h3>
              <div className="mt-4 space-y-3">
                <Input
                  label="Phone Number"
                  placeholder="+91xxxxxxxxxx"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                />
                {!phoneConfirmation ? (
                  <Button variant="secondary" className="w-full" onClick={onSendPhoneOtp} disabled={loading}>
                    Send OTP
                  </Button>
                ) : (
                  <>
                    <Input
                      label="OTP Code"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                    />
                    <Button variant="secondary" className="w-full" onClick={onVerifyPhoneOtp} disabled={loading}>
                      Verify OTP
                    </Button>
                  </>
                )}
                <div id="phone-recaptcha" />
              </div>
            </div>
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
