export const parseFlexibleNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== "string") {
    return Number(value);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return NaN;
  }

  if (trimmed.includes("/")) {
    const [numeratorText, denominatorText] = trimmed.split("/").map((part) => part.trim());
    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);

    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return NaN;
    }

    return numerator / denominator;
  }

  return Number(trimmed);
};
