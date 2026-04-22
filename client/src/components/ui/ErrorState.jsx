export const ErrorState = ({ title = "Something went wrong", description }) => (
  <div className="rounded-[28px] border border-red-200/20 bg-red-950/20 p-8 text-center shadow-soft backdrop-blur">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-200/25 bg-red-950/45 text-lg text-red-100">
      !
    </div>
    <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-red-200">{description}</p>
  </div>
);
