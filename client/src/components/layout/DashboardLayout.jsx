import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const links = user?.role === "admin" ? adminLinks : userLinks;
  const isUserView = user?.role === "user";

  const onLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  if (isUserView) {
    return (
      <div className="page-shell min-h-screen bg-background text-foreground">
        <div className="page-reveal mx-auto max-w-6xl space-y-4">
          <header className="ui-card rounded-[28px] px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Candidate View</p>
                <h1 className="mt-2 truncate text-xl font-semibold text-white sm:text-2xl">Exam Dashboard</h1>
              </div>

              <div className="flex items-center gap-2">
                <PwaActions compact />
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white"
                >
                  ⋯
                </button>
              </div>
            </div>

            <div className="mobile-scroll mt-4 overflow-x-auto pb-1">
              <div className="flex gap-2">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/dashboard"}
                    className={({ isActive }) =>
                      `whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-white bg-white text-black shadow-soft"
                          : "border-white/8 bg-white/[0.03] text-muted hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                      }`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          </header>

          {menuOpen ? (
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)}>
              <div
                className="absolute right-3 top-[max(1rem,var(--safe-top))] w-[min(88vw,320px)] rounded-[28px] border border-white/10 bg-[#0b0b0b] p-4 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.26em] text-muted">Signed In</p>
                    <h2 className="mt-3 truncate text-lg font-semibold text-white">{user?.name}</h2>
                    <p className="mt-1 break-all text-sm text-muted">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-5 grid gap-2">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === "/dashboard"}
                      className={({ isActive }) =>
                        `rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? "border-white bg-white text-black shadow-soft"
                            : "border-white/8 bg-white/[0.03] text-muted hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
                        }`
                      }
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                <Button variant="secondary" className="mt-5 w-full" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          ) : null}

          <main className="space-y-4">
            <Outlet />
          </main>

          <footer className="ui-card rounded-[28px] px-4 py-5 sm:px-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Exam Platform</p>
            <h3 className="mt-3 text-lg font-semibold text-white">Workspace View</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Find published exams, share them quickly, set reminders, and continue attempts with a cleaner mobile flow.
            </p>
          </footer>
        </div>
      </div>
    );
  }

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
            <h3 className="mt-3 text-lg font-semibold text-white">Admin Control Room</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Build exams, schedule them cleanly, and understand live performance with less clutter.
            </p>
          </div>

          <div className="mobile-scroll mt-6 overflow-x-auto pb-1 lg:overflow-visible">
            <div className="flex gap-2 lg:grid">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/admin"}
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
                  Run the platform with clarity
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                  Use this control layer to create exams, manage timing, and inspect candidate behavior and outcomes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Mode</p>
                  <p className="mt-2 text-base font-semibold text-white">Control</p>
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
