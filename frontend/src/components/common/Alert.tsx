import type { ReactNode } from "react";

export function Alert({
  tone = "error",
  children,
  onClose,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
  onClose?: () => void;
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  };
  return (
    <div className={`card flex items-start justify-between gap-3 border px-4 py-3 ${tones[tone]}`}>
      <div className="whitespace-pre-line text-sm">{children}</div>
      {onClose && (
        <button onClick={onClose} className="text-current/60 hover:text-current" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-24 text-navy-400">
      <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert tone="error">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-2 font-semibold underline">
          Retry
        </button>
      )}
    </Alert>
  );
}