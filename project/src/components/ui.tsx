import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-violet-900/40 bg-black/60 shadow-lg shadow-violet-950/30 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-violet-300/70">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-500 shadow-md shadow-violet-900/50",
    ghost: "text-violet-300 hover:bg-violet-900/40",
    danger: "bg-rose-950/50 text-rose-400 hover:bg-rose-900/50 border border-rose-900/50",
    outline:
      "border border-violet-700/60 text-violet-200 hover:bg-violet-900/30",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {icon && <div className="text-violet-700/60">{icon}</div>}
      <p className="text-sm font-medium text-violet-200">{title}</p>
      {hint && <p className="text-xs text-violet-400/60">{hint}</p>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
  );
}
