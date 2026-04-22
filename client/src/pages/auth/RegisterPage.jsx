import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { getRequestErrorMessage } from "../../utils/errors";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user"
  });
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`metric-tile ${form.role === "user" ? "border-white/20" : ""}`}>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">User Role</p>
            <p className="mt-2 text-sm leading-6 text-white">Attempt exams, track your results, and review question analysis.</p>
          </div>
          <div className={`metric-tile ${form.role === "admin" ? "border-white/20" : ""}`}>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Admin Role</p>
            <p className="mt-2 text-sm leading-6 text-white">Build papers, manage schedules, and monitor live submissions.</p>
          </div>
        </div>

        {error ? <p className="rounded-2xl border border-red-200/20 bg-red-950/20 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-white">
          Login
        </Link>
      </p>
    </Card>
  );
};
