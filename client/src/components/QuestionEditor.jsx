import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export const QuestionEditor = ({ question, index, onChange, onRemove }) => {
  const updateQuestion = (key, value) => {
    onChange(index, {
      ...question,
      [key]: value
    });
  };

  const updateOption = (optionIndex, value) => {
    const nextOptions = question.options.map((option, idx) =>
      idx === optionIndex ? { ...option, text: value } : option
    );
    updateQuestion("options", nextOptions);
  };

  const toggleCorrect = (optionIndex) => {
    const optionId = question.options[optionIndex]._id;
    let nextCorrectIds = [...question.correctOptionIds];

    if (question.type === "single") {
      nextCorrectIds = [optionId];
    } else if (nextCorrectIds.includes(optionId)) {
      nextCorrectIds = nextCorrectIds.filter((item) => item !== optionId);
    } else {
      nextCorrectIds.push(optionId);
    }

    updateQuestion("correctOptionIds", nextCorrectIds);
  };

  return (
    <div className="space-y-4 rounded-[28px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-white">Question {index + 1}</h3>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => onRemove(index)}>
          Remove
        </Button>
      </div>

      <Input
        label="Question prompt"
        value={question.prompt}
        onChange={(event) => updateQuestion("prompt", event.target.value)}
        placeholder="Enter question"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-muted">
          <span className="font-medium text-neutral-300">Question type</span>
          <select
            className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none transition focus:border-white/25 focus:bg-black/45"
            value={question.type}
            onChange={(event) =>
              onChange(index, {
                ...question,
                type: event.target.value,
                correctOptionIds:
                  event.target.value === "single" ? question.correctOptionIds.slice(0, 1) : question.correctOptionIds
              })
            }
          >
            <option value="single">Single Correct</option>
            <option value="multiple">Multiple Correct</option>
          </select>
        </label>

        <Input
          label="Marks"
          type="number"
          min="1"
          value={question.marks}
          onChange={(event) => updateQuestion("marks", Number(event.target.value))}
        />
      </div>

      <Input
        label="Explanation"
        value={question.explanation}
        onChange={(event) => updateQuestion("explanation", event.target.value)}
        placeholder="Optional explanation shown in result review"
      />

      <div className="grid gap-3">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">
          Select the correct {question.type === "single" ? "answer" : "answers"}
        </p>
        {question.options.map((option, optionIndex) => {
          const checked = question.correctOptionIds.includes(option._id);

          return (
            <div
              key={option._id}
              className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/25 p-3 sm:flex-row sm:items-center"
            >
              <input
                type={question.type === "single" ? "radio" : "checkbox"}
                checked={checked}
                onChange={() => toggleCorrect(optionIndex)}
                className="h-4 w-4"
              />
              <input
                className="min-h-[44px] w-full rounded-xl bg-transparent text-base text-white outline-none"
                value={option.text}
                onChange={(event) => updateOption(optionIndex, event.target.value)}
                placeholder={`Option ${optionIndex + 1}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
