export const ExamPalette = ({ questions, answerMap, currentQuestionId, onJump, disabled = false }) => {
  const stats = {
    answered: questions.filter((question) => answerMap[question._id]?.selectedOptionIds?.length > 0).length,
    skipped: questions.filter((question) => answerMap[question._id]?.isSkipped).length,
    review: questions.filter((question) => answerMap[question._id]?.markedForReview).length
  };

  return (
    <div className="ui-card rounded-[24px] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Question Slider</h3>
          <p className="mt-1 text-xs text-muted">Slide horizontally to jump to any question</p>
        </div>
        <span className="soft-chip">{questions.length}</span>
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

      <div className="mobile-scroll overflow-x-auto pb-2">
        <div className="flex gap-2">
          {questions.map((question, index) => {
            const answer = answerMap[question._id];
            const attempted = answer?.selectedOptionIds?.length > 0;
            const skipped = answer?.isSkipped;
            const review = answer?.markedForReview;
            const active = currentQuestionId === question._id;

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
                className={`shrink-0 min-w-[46px] rounded-2xl border px-3 py-3 text-xs font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${paletteClass}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
