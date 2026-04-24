import { startTransition, useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Loader } from "../../components/ui/Loader";
import { Input } from "../../components/ui/Input";
import { QuestionEditor } from "../../components/QuestionEditor";
import { formatDateTime } from "../../utils/format";
import { getRequestErrorMessage } from "../../utils/errors";
import { parseImportedQuestionsClient } from "../../utils/questionImportParser";

const createId = () =>
  globalThis.crypto?.randomUUID?.() || `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createOption = (text = "") => ({
  _id: createId(),
  text
});

const createQuestion = () => ({
  prompt: "",
  type: "single",
  marks: 1,
  explanation: "",
  options: [createOption(""), createOption(""), createOption(""), createOption("")],
  correctOptionIds: []
});

const isBlankQuestion = (question) =>
  !question.prompt?.trim() &&
  !question.explanation?.trim() &&
  (question.correctOptionIds?.length || 0) === 0 &&
  (question.options || []).every((option) => !option.text?.trim());

const createInitialExamForm = () => ({
  title: "",
  description: "",
  subject: "",
  topic: "",
  playlist: "",
  duration: 60,
  totalMarks: 100,
  negativeMarking: "0",
  maxAttempts: "1",
  status: "draft",
  isLocked: false,
  lockedUntil: "",
  startTime: "",
  endTime: "",
  questions: [createQuestion()]
});

const importTemplate = `Q: What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B
Explanation: Basic addition
Marks: 1
Type: single

Q: Which are prime numbers?
A. 2
B. 4
C. 5
D. 9
Answer: A,C
Type: multiple`;

export const AdminExamsPage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [hydratingEditor, setHydratingEditor] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createInitialExamForm);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [importMode, setImportMode] = useState("append");
  const [importText, setImportText] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState("");

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const builderStats = useMemo(() => {
    const readyQuestions = form.questions.filter((question) => question.prompt.trim()).length;
    const configuredMarks = form.questions.reduce((total, question) => total + Number(question.marks || 0), 0);

    return [
      { label: "Questions", value: form.questions.length },
      { label: "Ready", value: readyQuestions },
      { label: "Question Marks", value: configuredMarks }
    ];
  }, [form.questions]);

  const filteredExams = useMemo(() => {
    const query = filter.trim().toLowerCase();

    if (!query) {
      return exams;
    }

    return exams.filter((exam) =>
      [exam.title, exam.description, exam.subject, exam.topic, exam.playlist, exam.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [exams, filter]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/exams/admin");
      setExams(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const resetForm = () => {
    setEditingId("");
    setError("");
    setForm(createInitialExamForm());
  };

  const onQuestionChange = (index, nextQuestion) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((question, idx) => (idx === index ? nextQuestion : question))
    }));
  };

  const applyImportedQuestions = (questions) => {
    setForm((prev) => ({
      ...prev,
      questions:
        importMode === "replace" || (prev.questions.length === 1 && isBlankQuestion(prev.questions[0]))
          ? questions
          : [...prev.questions, ...questions]
    }));
  };

  const onEdit = async (exam) => {
    setHydratingEditor(true);
    setError("");

    try {
      const { data } = await api.get(`/exams/${exam._id}`);

      setEditingId(data._id);
      setForm({
        title: data.title,
        description: data.description,
        subject: data.subject || "",
        topic: data.topic || "",
        playlist: data.playlist || "",
        duration: data.duration,
        totalMarks: data.totalMarks,
        negativeMarking: String(data.negativeMarking),
        maxAttempts: (data.maxAttempts ?? 1) === 0 ? "unlimited" : String(data.maxAttempts ?? 1),
        status: data.status,
        isLocked: Boolean(data.isLocked),
        lockedUntil: data.lockedUntil ? new Date(data.lockedUntil).toISOString().slice(0, 16) : "",
        startTime: new Date(data.startTime).toISOString().slice(0, 16),
        endTime: new Date(data.endTime).toISOString().slice(0, 16),
        questions: data.questions.map((question) => ({
          ...question,
          correctOptionIds: question.correctOptionIds.map((id) => id.toString())
        }))
      });

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Unable to load this exam for editing"));
    } finally {
      setHydratingEditor(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this exam and all related results?")) {
      return;
    }

    await api.delete(`/exams/${id}`);
    await loadExams();

    if (editingId === id) {
      resetForm();
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const missingCorrectAnswers = form.questions
        .map((question, index) => ({
          index,
          hasCorrectAnswer: Array.isArray(question.correctOptionIds) && question.correctOptionIds.length > 0
        }))
        .filter((item) => !item.hasCorrectAnswer);

      if (missingCorrectAnswers.length > 0) {
        throw new Error(
          `Select at least one correct option for question${missingCorrectAnswers.length > 1 ? "s" : ""} ${missingCorrectAnswers
            .map((item) => item.index + 1)
            .join(", ")}`
        );
      }

      const payload = {
        ...form,
        questions: form.questions,
        lockedUntil: form.lockedUntil ? new Date(form.lockedUntil).toISOString() : "",
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString()
      };

      if (isEditing) {
        await api.put(`/exams/${editingId}`, payload);
      } else {
        await api.post("/exams", payload);
      }

      resetForm();
      await loadExams();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, requestError.message || "Unable to save exam"));
    } finally {
      setSaving(false);
    }
  };

  const onImportQuestions = async () => {
    setImportError("");
    setImporting(true);

    try {
      if (!importText.trim() && !importFile) {
        throw new Error("Paste questions or choose a .txt or .docx file to import.");
      }

      const payload = new FormData();

      if (importText.trim()) {
        payload.append("text", importText);
      }

      if (importFile) {
        payload.append("file", importFile);
      }

      const lowerFileName = importFile?.name?.toLowerCase() || "";
      const shouldParseInBrowser = importText.trim() || lowerFileName.endsWith(".txt");

      if (shouldParseInBrowser) {
        const sourceText = importText.trim() ? importText : await importFile.text();
        const questions = parseImportedQuestionsClient(sourceText);
        startTransition(() => {
          applyImportedQuestions(questions);
        });
      } else {
        const { data } = await api.post("/exams/import-questions", payload, {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          timeout: 180000
        });

        startTransition(() => {
          applyImportedQuestions(data.questions);
        });
      }

      setImportText("");
      setImportFile(null);
    } catch (requestError) {
      setImportError(getRequestErrorMessage(requestError, requestError.message || "Unable to import questions"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-[32px] p-6 sm:p-7">
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Admin Builder</p>
            <h2 className="mt-5 text-3xl font-semibold text-white">{isEditing ? "Edit Exam" : "Create Exam"}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Build a simpler exam flow with overall timer, clean metadata, and standard question setup.
            </p>
          </div>
          {isEditing ? (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={resetForm}>
              Cancel Edit
            </Button>
          ) : null}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {builderStats.map((item) => (
            <div key={item.label} className="metric-tile">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input label="Description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            <Input label="Subject" value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Reasoning, Physics" />
            <Input label="Topic" value={form.topic} onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))} placeholder="Algebra, Verbal Ability" />
            <Input label="Playlist / Series" value={form.playlist} onChange={(event) => setForm((prev) => ({ ...prev, playlist: event.target.value }))} placeholder="Mock Set A, Crash Course" />
            <Input label="Duration (minutes)" type="number" min="1" value={form.duration} onChange={(event) => setForm((prev) => ({ ...prev, duration: Number(event.target.value) }))} />
            <Input label="Total Marks" type="number" min="1" value={form.totalMarks} onChange={(event) => setForm((prev) => ({ ...prev, totalMarks: Number(event.target.value) }))} />
            <Input label="Negative Marking" type="text" value={form.negativeMarking} onChange={(event) => setForm((prev) => ({ ...prev, negativeMarking: event.target.value }))} placeholder="0, 0.25, 1/3" />
            <label className="flex flex-col gap-2 text-sm text-muted">
              <span className="font-medium text-neutral-300">Allowed Attempts</span>
              <select className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-white/25 focus:bg-black/45" value={form.maxAttempts} onChange={(event) => setForm((prev) => ({ ...prev, maxAttempts: event.target.value }))}>
                <option value="1">1 attempt</option>
                <option value="2">2 attempts</option>
                <option value="3">3 attempts</option>
                <option value="5">5 attempts</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-muted">
              <span className="font-medium text-neutral-300">Status</span>
              <select className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-white/25 focus:bg-black/45" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <Input label="Start Time" type="datetime-local" value={form.startTime} onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))} />
            <Input label="End Time" type="datetime-local" value={form.endTime} onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))} />
            <Input label="Locked Until (optional)" type="datetime-local" value={form.lockedUntil} onChange={(event) => setForm((prev) => ({ ...prev, lockedUntil: event.target.value }))} />
            <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3 text-sm text-neutral-200">
              <input type="checkbox" checked={form.isLocked} onChange={(event) => setForm((prev) => ({ ...prev, isLocked: event.target.checked }))} />
              Lock this exam manually until an admin unlocks it
            </label>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-black/30 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted">Question Import</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Paste or upload questions</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Import questions from pasted text, a `.txt` file, or a Word `.docx` file.
                </p>
              </div>

              <label className="flex min-w-[180px] flex-col gap-2 text-sm text-muted">
                <span className="font-medium text-neutral-300">Import mode</span>
                <select className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-white/25 focus:bg-black/45" value={importMode} onChange={(event) => setImportMode(event.target.value)}>
                  <option value="append">Append to existing questions</option>
                  <option value="replace">Replace all questions</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <label className="flex flex-col gap-2 text-sm text-muted">
                <span className="font-medium text-neutral-300">Paste question content</span>
                <textarea className="min-h-[260px] rounded-[24px] border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 focus:bg-black/45" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={importTemplate} />
              </label>

              <div className="space-y-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Upload file</p>
                  <p className="mt-1 text-sm text-muted">Supported formats: `.txt` and `.docx`</p>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 px-4 py-8 text-center text-sm text-muted hover:border-white/28">
                  <span>{importFile ? importFile.name : "Choose a .txt or .docx file"}</span>
                  <input type="file" accept=".txt,.docx" className="hidden" onChange={(event) => setImportFile(event.target.files?.[0] || null)} />
                </label>

                <div className="rounded-[24px] border border-white/8 bg-black/30 p-4">
                  <p className="text-sm font-semibold text-white">Expected format</p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted">{importTemplate}</pre>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setImportText(importTemplate)}>
              Load Sample Format
            </Button>
              <Button className="w-full sm:w-auto" onClick={onImportQuestions} disabled={importing}>
                {importing ? "Importing..." : "Import Questions"}
              </Button>
            </div>
            {importError ? <p className="mt-3 text-sm text-red-300">{importError}</p> : null}
          </div>

          <div className="space-y-4">
            {form.questions.map((question, index) => (
              <QuestionEditor key={question._id || index} question={question} index={index} onChange={onQuestionChange} onRemove={(removeIndex) => setForm((prev) => ({ ...prev, questions: prev.questions.length === 1 ? prev.questions : prev.questions.filter((_, idx) => idx !== removeIndex) }))} />
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setForm((prev) => ({ ...prev, questions: [...prev.questions, createQuestion()] }))}>
              Add Question
            </Button>
            <Button className="w-full sm:w-auto" type="submit" disabled={saving || hydratingEditor}>
              {saving ? "Saving..." : hydratingEditor ? "Loading Exam..." : isEditing ? "Update Exam" : "Create Exam"}
            </Button>
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>
      </Card>

      <Card className="rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Exam Library</p>
            <h2 className="mt-5 text-3xl font-semibold text-white">All Exams</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Search by title, subject, topic, playlist, or status.</p>
          </div>
          <div className="w-full max-w-sm">
            <Input label="Search exams" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by title, subject, playlist, topic, or status" />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <Loader label="Loading exams..." />
          ) : filteredExams.length ? (
            <div className="space-y-4">
              {filteredExams.map((exam) => (
                <div key={exam._id} className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{exam.title}</h3>
                        <span className="soft-chip">{exam.status}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">{exam.description}</p>
                      <p className="mt-3 text-sm text-muted">{[exam.subject, exam.topic, exam.playlist].filter(Boolean).join(" | ") || "No subject tags yet"}</p>
                      <p className="mt-1 text-sm text-muted">
                        {exam.questionCount ?? 0} questions | {exam.duration} minutes | {exam.totalMarks} marks
                      </p>
                      <p className="text-sm text-muted">{formatDateTime(exam.startTime)} to {formatDateTime(exam.endTime)}</p>
                      {exam.isLocked || exam.lockedUntil ? (
                        <p className="mt-1 text-sm text-amber-200">
                          Locked {exam.lockedUntil ? `until ${formatDateTime(exam.lockedUntil)}` : "until admin unlocks"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button variant="secondary" className="w-full sm:w-auto" onClick={() => onEdit(exam)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="w-full sm:w-auto" onClick={() => onDelete(exam._id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={filter ? "No matching exams" : "No exams yet"} description={filter ? "Try a different search term or clear the filter." : "Create your first exam to unlock scheduling, playlists, results, and analytics."} />
          )}
        </div>
      </Card>
    </div>
  );
};
