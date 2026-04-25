import { useMemo, useState } from "react";

const CHUNK_SIZE = 25;

export const ExamPalette = ({ questions, answerMap, currentQuestionId, onJump, disabled = false }) => {
  const groups = useMemo(() => {
    const chunks = [];

    for (let index = 0; index < questions.length; index += CHUNK_SIZE) {
      const chunkQuestions = questions.slice(index, index + CHUNK_SIZE);
      chunks.push({
        key: `${index + 1}-${index + chunkQuestions.length}`,
        label: `${index + 1}-${index + chunkQuestions.length}`,
        questions: chunkQuestions
      });
    }

    return chunks;
  }, [questions]);

  const currentGroupIndex = useMemo(() => {
    const activeIndex = questions.findIndex((question) => question._id === currentQuestionId);
    return activeIndex >= 0 ? Math.floor(activeIndex / CHUNK_SIZE) : 0;
  }, [questions, currentQuestionId]);

  const [activeGroupIndex, setActiveGroupIndex] = useState(currentGroupIndex);

  const safeGroupIndex = Math.min(activeGroupIndex, Math.max(groups.length - 1, 0));
  const activeGroup = groups[safeGroupIndex] || { questions: [], label: "1-1" };

  const stats = useMemo(() => {
    const answered = questions.filter((question) => answerMap[question._id]?.selectedOptionIds?.length > 0).length;
    const skipped = questions.filter((question) => answerMap[question._id]?.isSkipped).length;
    const review = questions.filter((question) => answerMap[question._id]?.markedForReview).length;
    return { answered, skipped, review };
  }, [questions, answerMap]);

  return (
    <div className="ui-card rounded-[24px] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Question Palette</h3>
          <p className="mt-1 text-xs text-muted">Compact view for long exams</p>
        </div>
        <span className="soft-chip">{questions.length} total</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200">Answered</p>
          <p className="mt-1 text-lg font-semibold text-white">{stats.answered}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-amber-200">Skipped</p>
          <p className="mt-1 text-lg font-semibold text-white">{stats.skipped}</p>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-rose-200">Review</p>
          <p className="mt-1 text-lg font-semibold text-white">{stats.review}</p>
        </div>
      </div>

      {groups.length > 1 ? (
        <div className="mobile-scroll mb-4 flex gap-2 overflow-x-auto pb-1">
          {groups.map((group, index) => (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveGroupIndex(index)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                index === safeGroupIndex
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/5 text-neutral-200 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-[22px] border border-white/8 bg-black/30 p-3">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>Showing questions {activeGroup.label}</span>
          <span>{safeGroupIndex + 1}/{groups.length || 1}</span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-5">
          {activeGroup.questions.map((question, index) => {
            const answer = answerMap[question._id];
            const attempted = answer?.selectedOptionIds?.length > 0;
            const skipped = answer?.isSkipped;
            const review = answer?.markedForReview;
            const active = currentQuestionId === question._id;
            const questionNumber = safeGroupIndex * CHUNK_SIZE + index + 1;

            const paletteClass = active
              ? "border-white bg-white text-black shadow-soft"
              : review
                ? "border-rose-400/50 bg-rose-500/12 text-rose-100"
                : skipped
                  ? "border-amber-400/50 bg-amber-500/12 text-amber-100"
                  : attempted
                    ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-100"
                    : "border-white/8 bg-black/50 text-muted hover:bg-white/5";

            return (
              <button
                key={question._id}
                type="button"
                onClick={() => onJump(question._id)}
                disabled={disabled}
                className={`min-h-[46px] rounded-2xl border px-2 py-2 text-xs font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${paletteClass}`}
              >
                {questionNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
