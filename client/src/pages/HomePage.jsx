import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const highlights = [
  { label: "Secure Attempts", value: "Live timer, autosave, fullscreen guardrails" },
  { label: "Admin Control", value: "Scheduling, imports, analytics, result review" },
  { label: "Mobile Ready", value: "Optimized for Android browsers and small screens" }
];

const featureCards = [
  {
    title: "Builder Workflow",
    description: "Create exams, import questions, tune negative marking, and control attempts from one polished flow."
  },
  {
    title: "Candidate Focus",
    description: "Large tap targets, clean palettes, progress snapshots, and low-friction exam navigation."
  },
  {
    title: "Operational Clarity",
    description: "Track submissions, fullscreen exits, tab switching, and performance trends without hunting for data."
  }
];

export const HomePage = () => (
  <div className="grid-backdrop page-shell relative min-h-screen min-h-svh overflow-hidden py-6 sm:py-10">
    <div className="ambient-orb left-[-80px] top-[60px]" />
    <div className="ambient-orb-right right-[-50px] top-[220px]" />

    <div className="page-reveal mx-auto max-w-6xl">
      <header className="ui-card rounded-[32px] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Exam Platform</p>
            <p className="mt-3 text-sm text-muted">A competitive exam experience with stronger control and calmer UX.</p>
          </div>

          <div className="grid w-full gap-3 sm:flex sm:w-auto">
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Login
              </Button>
            </Link>
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Launch Workspace</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="section-kicker">Modern Competitive Testing</p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] text-white sm:text-5xl lg:text-7xl">
            Make exam delivery feel precise, fast, and genuinely engaging.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
            Built for admins who want operational control and candidates who need a dependable exam flow without
            friction. Strong structure, clean motion, better focus, and sharper surfaces across every screen.
          </p>

          <div className="mt-10 grid gap-4 sm:flex sm:flex-wrap">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full px-6 py-3 sm:w-auto">Create Account</Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full px-6 py-3 sm:w-auto">
                Open Dashboard
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="soft-chip">JWT Authentication</span>
            <span className="soft-chip">Realtime Answer Saves</span>
            <span className="soft-chip">Exam Imports</span>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-xs uppercase tracking-[0.28em] text-muted">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Card className="rounded-[32px] p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Command Center</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">One place for admin control and user flow</h2>
              </div>
              <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white sm:block">
                Live
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-muted">Admin Surface</p>
                <h3 className="mt-3 text-xl font-semibold text-white">Schedule, publish, inspect</h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Build exams faster with imports, attempt limits, scoring control, and readable analytics.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/50 p-5">
                <p className="text-sm text-muted">Attempt Surface</p>
                <h3 className="mt-3 text-xl font-semibold text-white">Secure, responsive, and focused</h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Candidates stay oriented with timers, palette navigation, autosave, and fullscreen prompts.
                </p>
              </div>
            </div>

            <div className="glass-divider mt-6" />

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Exam Imports</p>
                <p className="mt-2 text-lg font-semibold text-white">TXT, DOCX, paste</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Monitoring</p>
                <p className="mt-2 text-lg font-semibold text-white">Tab + fullscreen events</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Results</p>
                <p className="mt-2 text-lg font-semibold text-white">Scores under 100%</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            {featureCards.map((item) => (
              <Card key={item.title} className="rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-muted">{item.title}</p>
                <p className="mt-4 text-sm leading-6 text-white">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  </div>
);
