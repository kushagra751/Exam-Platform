export const ExamPalette = ({ questions, answerMap, currentQuestionId, onJump }) => (
  <div className="ui-card rounded-[24px] p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-white">Question Palette</h3>
      <span className="soft-chip">{questions.length} total</span>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-2 text-[11px] text-muted sm:grid-cols-4">
      <span className="soft-chip justify-center bg-white text-black">Current</span>
      <span className="soft-chip justify-center bg-emerald-500/12 text-emerald-200">Answered</span>
      <span className="soft-chip justify-center bg-amber-500/12 text-amber-200">Skipped</span>
      <span className="soft-chip justify-center bg-rose-500/12 text-rose-200">Review</span>
    </div>

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
            onClick={() => onJump(question._id)}
            className={`min-h-[46px] rounded-2xl border px-3 py-2 text-xs font-semibold transition duration-200 ${paletteClass}`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  </div>
);
