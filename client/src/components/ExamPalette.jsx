export const ExamPalette = ({
  questions,
  answerMap,
  currentQuestionId,
  onJump,
  disabled = false,
  open = false,
  onClose
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/55" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[78vh] rounded-t-[28px] border border-white/10 bg-[#090909] p-4 shadow-2xl sm:left-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[360px] sm:max-h-none sm:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Question Jump</h3>
            <p className="mt-1 text-xs text-muted">Tap any question number to move there</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200">Answered</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {questions.filter((question) => answerMap[question._id]?.selectedOptionIds?.length > 0).length}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-amber-200">Skipped</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {questions.filter((question) => answerMap[question._id]?.isSkipped).length}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-rose-200">Review</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {questions.filter((question) => answerMap[question._id]?.markedForReview).length}
            </p>
          </div>
        </div>

        <div className="mobile-scroll mt-4 max-h-[52vh] overflow-y-auto pr-1 sm:max-h-[calc(100vh-180px)]">
          <div className="grid grid-cols-5 gap-2">
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
                  disabled={disabled}
                  onClick={() => {
                    onJump(question._id);
                    onClose?.();
                  }}
                  className={`min-h-[48px] rounded-2xl border px-2 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${paletteClass}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
