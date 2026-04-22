export const Input = ({ label, error, ...props }) => (
  <label className="flex flex-col gap-2 text-sm text-muted">
    <span className="font-medium text-neutral-300">{label}</span>
    <input
      className="min-h-[52px] rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-base text-foreground outline-none transition placeholder:text-neutral-500 focus:border-white/25 focus:bg-black/45"
      {...props}
    />
    {error ? <span className="text-xs text-red-300">{error}</span> : null}
  </label>
);
