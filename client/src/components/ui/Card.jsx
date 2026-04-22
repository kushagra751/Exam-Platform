export const Card = ({ children, className = "" }) => (
  <div className={`ui-card rounded-[28px] p-5 shadow-panel ${className}`}>
    {children}
  </div>
);
