import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { getRequestErrorMessage } from "../../utils/errors";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const {
    register,
    loginWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    loading,
    phoneConfirmation,
    isFirebaseConfigured
  } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const data = await register(form);
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Unable to register"));
    }
  };

  const onGoogleSignup = async () => {
    setError("");

    try {
      const data = await loginWithGoogle(form.role);

      if (data) {
        navigate(data.role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to continue with Google"));
    }
  };

  const onSendPhoneOtp = async () => {
    setError("");

    try {
      await sendPhoneOtp(phoneNumber, "register-phone-recaptcha");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to send OTP"));
    }
  };

  const onVerifyPhoneOtp = async () => {
    setError("");

    try {
      const data = await verifyPhoneOtp(otp, form.role);
      navigate(data.role === "admin" ? "/admin" : "/dashboard");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to verify OTP"));
    }
  };

  return (
    <Card className="rounded-[32px] p-6 sm:p-7">
      <p className="section-kicker">Register</p>
      <h2 className="mt-5 text-3xl font-semibold text-white">Create account</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Join as an admin for platform control or as a user for the full exam experience.
      </p>

      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <Input
          label="Full name"
          placeholder="Your name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
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
          placeholder="Choose a strong password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />

        <label className="flex flex-col gap-2 text-sm text-muted">
          <span className="font-medium text-neutral-300">Role</span>
          <select
            className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-white/25 focus:bg-black/45"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        {error ? <p className="rounded-2xl border border-red-200/20 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </Button>
      </form>

      {isFirebaseConfigured ? (
        <>
          <div className="my-6 glass-divider" />

          <div className="space-y-4">
            <Button variant="secondary" className="w-full" onClick={onGoogleSignup} disabled={loading}>
              Continue with Google
            </Button>

            <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white">Phone Signup</h3>
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
                <div id="register-phone-recaptcha" />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-white">
          Login
        </Link>
      </p>
    </Card>
  );
};
