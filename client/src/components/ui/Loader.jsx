export const Loader = ({ label = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
    <div className="relative h-14 w-14">
      <div className="absolute inset-0 rounded-full border border-white/10" />
      <div className="absolute inset-[6px] rounded-full border border-dashed border-white/40 animate-spin" />
      <div className="absolute inset-[16px] rounded-full bg-white/90 shadow-soft" />
    </div>
    <p className="text-sm text-muted">{label}</p>
  </div>
);
