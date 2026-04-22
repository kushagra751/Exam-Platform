export const ExamPalette = ({ questions, answerMap, currentQuestionId, onJump }) => (
  <div className="ui-card rounded-[28px] p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-white">Question Palette</h3>
      <span className="soft-chip">{questions.length} total</span>
    </div>
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 xl:grid-cols-5">
      {questions.map((question, index) => {
        const answer = answerMap[question._id];
        const attempted = answer?.selectedOptionIds?.length > 0;
        const review = answer?.markedForReview;
        const active = currentQuestionId === question._id;

        return (
          <button
            key={question._id}
            onClick={() => onJump(question._id)}
            className={`min-h-[46px] rounded-2xl border px-3 py-2 text-xs font-semibold transition duration-200 ${
              active
                ? "border-white bg-white text-black shadow-soft"
                : review
                  ? "border-neutral-500 bg-neutral-800 text-white"
                  : attempted
                    ? "border-neutral-300 bg-neutral-200 text-black"
                    : "border-white/8 bg-black/50 text-muted hover:bg-white/5"
            }`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  </div>
);
