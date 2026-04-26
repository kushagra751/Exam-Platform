import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { Input } from "../../components/ui/Input";
import { getRequestErrorMessage } from "../../utils/errors";

const stepMeta = [
  { id: 1, label: "Language" },
  { id: 2, label: "Category" },
  { id: 3, label: "Setup" },
  { id: 4, label: "Confirm" }
];

export const CurrentAffairsPage = () => {
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    language: "english",
    category: "india",
    stateName: "",
    questionCount: 20,
    duration: 20
  });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { data } = await api.get("/current-affairs/options");
        setOptions(data);
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, "Unable to load current affairs setup"));
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  const summary = useMemo(() => {
    if (!options) {
      return [];
    }

    return [
      { label: "Language", value: form.language === "hindi" ? "Hindi" : "English" },
      {
        label: "Category",
        value: form.category === "state" ? `State: ${form.stateName || "Select state"}` : "India Current Affairs"
      },
      { label: "Questions", value: form.questionCount },
      { label: "Timer", value: `${form.duration} minutes` },
      { label: "Skip Limit", value: `${options.maxSkips} max skips` }
    ];
  }, [form, options]);

  const nextStep = () => {
    if (step === 2 && form.category === "state" && !form.stateName) {
      setError("Please select a state before moving ahead.");
      return;
    }

    if (step === 3 && (!form.questionCount || !form.duration)) {
      setError("Please complete question count and timer.");
      return;
    }

    setError("");
    setStep((value) => Math.min(value + 1, 4));
  };

  const previousStep = () => {
    setError("");
    setStep((value) => Math.max(value - 1, 1));
  };

  const startExam = async () => {
    setSubmitting(true);
    setError("");

    try {
      const { data } = await api.post("/current-affairs/generate", form);
      navigate(`/exam/${data.examId}/instructions`);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Unable to prepare current affairs exam"));
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return <Loader label="Preparing current affairs workspace..." />;
  }

  if (!options) {
    return (
      <div className="space-y-4">
        <Card className="rounded-[28px] p-5">
          <p className="text-sm text-red-300">{error || "Current affairs setup is unavailable."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-[30px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Current Affairs</p>
            <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Generate a fresh current affairs exam</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Pick your language, choose India or a state-focused feed, set question count and timer, then enter an auto-generated exam built from fresh current affairs sources.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {stepMeta.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border px-3 py-3 text-center text-xs ${
                  step === item.id
                    ? "border-white bg-white text-black"
                    : step > item.id
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                      : "border-white/8 bg-white/[0.03] text-muted"
                }`}
              >
                <p className="font-semibold">{item.id}</p>
                <p className="mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {step === 1 ? (
        <Card className="rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Step 1</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Choose language</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {options.languages.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, language: option.value }))}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  form.language === option.value
                    ? "border-white bg-white text-black"
                    : "border-white/8 bg-white/[0.03] text-white hover:border-white/16 hover:bg-white/[0.06]"
                }`}
              >
                <p className="text-lg font-semibold">{option.label}</p>
                <p className={`mt-2 text-sm ${form.language === option.value ? "text-black/70" : "text-muted"}`}>
                  Generate the paper in {option.label}.
                </p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Step 2</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Choose category</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {options.categories.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    category: option.value,
                    stateName: option.value === "state" ? prev.stateName : ""
                  }))
                }
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  form.category === option.value
                    ? "border-white bg-white text-black"
                    : "border-white/8 bg-white/[0.03] text-white hover:border-white/16 hover:bg-white/[0.06]"
                }`}
              >
                <p className="text-lg font-semibold">{option.label}</p>
                <p className={`mt-2 text-sm ${form.category === option.value ? "text-black/70" : "text-muted"}`}>
                  {option.value === "state" ? "Focus on a single state's daily updates." : "Cover nationwide current affairs."}
                </p>
              </button>
            ))}
          </div>

          {form.category === "state" ? (
            <div className="mt-5">
              <label className="flex flex-col gap-2 text-sm text-muted">
                <span className="font-medium text-neutral-300">State</span>
                <select
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition focus:border-white/25"
                  value={form.stateName}
                  onChange={(event) => setForm((prev) => ({ ...prev, stateName: event.target.value }))}
                >
                  <option value="">Select state</option>
                  {options.states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Step 3</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Configure exam</h2>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-medium text-neutral-200">Number of Questions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.questionPresets.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, questionCount: value }))}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      form.questionCount === value
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-white/[0.03] text-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="mt-3 max-w-xs">
                <Input
                  label="Custom question count"
                  type="number"
                  min="1"
                  max="100"
                  value={form.questionCount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, questionCount: Math.min(Math.max(Number(event.target.value) || 1, 1), 100) }))
                  }
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-neutral-200">Timer in Minutes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.timerPresets.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, duration: value }))}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      form.duration === value
                        ? "border-white bg-white text-black"
                        : "border-white/10 bg-white/[0.03] text-white"
                    }`}
                  >
                    {value}m
                  </button>
                ))}
              </div>
              <div className="mt-3 max-w-xs">
                <Input
                  label="Custom timer"
                  type="number"
                  min="1"
                  max={options.maxTimerMinutes}
                  value={form.duration}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      duration: Math.min(Math.max(Number(event.target.value) || 1, 1), options.maxTimerMinutes)
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="rounded-[30px] p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Step 4</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Review before entering</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {summary.map((item) => (
              <div key={item.label} className="metric-tile">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{item.label}</p>
                <p className="mt-3 text-base font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-100">
              Once you start the exam, timer will begin and cannot be paused.
            </p>
          </div>

          <Button className="mt-5 w-full sm:w-auto" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            {submitting ? "Preparing..." : "Enter Exam"}
          </Button>
        </Card>
      ) : null}

      {error ? (
        <Card className="rounded-[24px] p-4">
          <p className="text-sm text-red-300">{error}</p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" className="sm:w-auto" onClick={previousStep} disabled={step === 1 || submitting}>
          Back
        </Button>
        {step < 4 ? (
          <Button className="sm:w-auto" onClick={nextStep}>
            Continue
          </Button>
        ) : null}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 px-4 py-6" onClick={() => !submitting && setConfirmOpen(false)}>
          <div
            className="mx-auto max-w-md rounded-[30px] border border-white/10 bg-[#090909] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Final Warning</p>
            <h3 className="mt-3 text-xl font-semibold text-white">Start Current Affairs Exam?</h3>
            <p className="mt-3 text-sm leading-6 text-muted">
              Once you start the exam, timer will begin and cannot be paused.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="w-full" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button className="w-full" onClick={startExam} disabled={submitting}>
                {submitting ? "Preparing..." : "Enter Exam"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
