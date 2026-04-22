export const Button = ({
  children,
  className = "",
  variant = "primary",
  type = "button",
  disabled = false,
  ...props
}) => {
  const variants = {
    primary:
      "border border-white bg-white text-black shadow-soft hover:-translate-y-px hover:bg-neutral-100 hover:shadow-panel",
    secondary:
      "border border-white/10 bg-white/5 text-white hover:-translate-y-px hover:border-white/20 hover:bg-white/10",
    danger:
      "border border-white/10 bg-neutral-800 text-white hover:-translate-y-px hover:bg-neutral-700"
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`min-h-[48px] rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
