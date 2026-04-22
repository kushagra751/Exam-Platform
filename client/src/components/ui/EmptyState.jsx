export const EmptyState = ({ title, description }) => (
  <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] p-8 text-center backdrop-blur">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white">
      0
    </div>
    <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
  </div>
);
