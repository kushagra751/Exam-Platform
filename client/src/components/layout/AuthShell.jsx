import { Outlet, Link } from "react-router-dom";

const authHighlights = [
  "Import questions from text or Word files",
  "Run exams with secure fullscreen prompts",
  "Review results with clean admin analytics"
];

export const AuthShell = () => (
  <div className="grid min-h-screen min-h-svh lg:grid-cols-[1.08fr_0.92fr]">
    <section className="relative hidden overflow-hidden border-r border-white/8 bg-black px-12 py-16 lg:flex lg:flex-col lg:justify-between">
      <div className="ambient-orb left-[-70px] top-[80px]" />
      <div className="ambient-orb-right right-[-40px] bottom-[80px]" />

      <div className="relative z-10 max-w-2xl">
        <p className="section-kicker">Exam Platform</p>
        <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[1.02] text-white">
          A sharper exam experience for admins and candidates alike.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-neutral-300">
          This workspace is designed to feel structured, modern, and calm while still giving you strong operational
          control across exam setup, live attempts, and result review.
        </p>
      </div>

      <div className="relative z-10 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Fast Setup</p>
            <p className="mt-3 text-lg font-semibold text-white">Import + publish quickly</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Live Flow</p>
            <p className="mt-3 text-lg font-semibold text-white">Autosave + palette navigation</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Better Review</p>
            <p className="mt-3 text-lg font-semibold text-white">Detailed performance insight</p>
          </div>
        </div>

        <div className="ui-card rounded-[30px] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">What you get</p>
          <div className="mt-5 space-y-4">
            {authHighlights.map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-white shadow-soft" />
                <p className="text-sm leading-6 text-neutral-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="page-shell flex items-center justify-center py-10 sm:py-12">
      <div className="page-reveal w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex text-sm text-muted transition hover:text-white">
          Back to home
        </Link>

        <div className="mb-5 rounded-[28px] border border-white/8 bg-white/[0.03] p-5 lg:hidden">
          <p className="section-kicker">Welcome</p>
          <h2 className="mt-4 text-2xl font-semibold text-white">Sign in and continue the workspace flow</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Manage exams, attempt tests, and review results from a cleaner mobile-friendly interface.
          </p>
        </div>

        <Outlet />
      </div>
    </section>
  </div>
);
