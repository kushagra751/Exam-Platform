export const Input = ({ label, error, ...props }) => (
  <label className="flex flex-col gap-2 text-sm text-muted">
    <span className="font-medium text-neutral-300">{label}</span>
    <input
      className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-base text-foreground outline-none transition placeholder:text-neutral-500 focus:border-white/40 focus:bg-black/45 focus-visible:ring-2 focus-visible:ring-white/50"
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
    {error ? <span role="alert" className="text-xs text-red-300">{error}</span> : null}
  </label>
);
