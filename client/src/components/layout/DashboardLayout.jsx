import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/Button";
import { PwaActions } from "../PwaActions";

const adminLinks = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/exams", label: "Exams" },
  { to: "/admin/results", label: "Results" }
];

const userLinks = [
  { to: "/dashboard", label: "Exams" },
  { to: "/my-results", label: "My Results" }
];

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user?.role === "admin" ? adminLinks : userLinks;

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-shell min-h-screen bg-background text-foreground">
      <div className="page-reveal mx-auto flex min-h-screen max-w-7xl flex-col gap-4 lg:grid lg:grid-cols-[300px_1fr] lg:gap-6">
        <aside className="ui-card rounded-[32px] p-4 sm:p-5 lg:min-h-[calc(100vh-2rem)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link to="/" className="text-xl font-semibold text-white">
                Exam Platform
              </Link>
              <p className="mt-2 text-sm text-muted">Sharper control for exams, attempts, and results.</p>
            </div>
            <span className="soft-chip hidden sm:inline-flex">{user?.role}</span>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted">Workspace</p>
            <h3 className="mt-3 text-lg font-semibold text-white">
              {user?.role === "admin" ? "Admin Control Room" : "Candidate Dashboard"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              {user?.role === "admin"
                ? "Build exams, schedule them cleanly, and understand live performance with less clutter."
                : "Find active exams, start attempts quickly, and review your performance without friction."}
            </p>
          </div>

          <div className="mobile-scroll mt-6 overflow-x-auto pb-1 lg:overflow-visible">
            <div className="flex gap-2 lg:grid">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/admin" || link.to === "/dashboard"}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-medium transition duration-200 ${
                      isActive
                        ? "border-white bg-white text-black shadow-soft"
                        : "border-white/8 bg-white/[0.03] text-muted hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="glass-divider my-6" />

          <div className="rounded-[28px] border border-white/8 bg-black/35 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted">Signed In</p>
            <h2 className="mt-3 break-words text-xl font-semibold text-white">{user?.name}</h2>
            <p className="mt-2 break-all text-sm text-muted">{user?.email}</p>
          </div>

          <Button variant="secondary" className="mt-6 w-full" onClick={onLogout}>
            Logout
          </Button>
        </aside>

        <main className="min-w-0 space-y-6">
          <header className="ui-card rounded-[32px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="section-kicker">Workspace View</p>
                <h1 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
                  {user?.role === "admin" ? "Run the platform with clarity" : "Stay ready for your next attempt"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  {user?.role === "admin"
                    ? "Use this control layer to create exams, manage timing, and inspect candidate behavior and outcomes."
                    : "Your dashboard keeps live exams, attempt flow, and results easy to reach on both desktop and mobile."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Mode</p>
                  <p className="mt-2 text-base font-semibold text-white">{user?.role === "admin" ? "Control" : "Attempt"}</p>
                </div>
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Access</p>
                  <p className="mt-2 text-base font-semibold text-white">Protected</p>
                </div>
              </div>
            </div>
          </header>

          <PwaActions />

          <Outlet />
        </main>
      </div>
    </div>
  );
};
