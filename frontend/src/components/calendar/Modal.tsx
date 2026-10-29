import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

/** Accessible dialog shell: Escape + backdrop close, focus on open, focus restore. */
export function CalendarModal({
  open,
  onClose,
  title,
  dark = false,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  dark?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelCls = dark
    ? "border-[#2a3a5c] bg-[#111a2e] text-[#e9eefb]"
    : "border-navy-100 bg-white text-ink";

  const closeBtnCls = dark
    ? "text-[#8fa0c4] hover:bg-white/10 hover:text-white"
    : "text-navy-400 hover:bg-navy-50 hover:text-navy-700";

  return (
    <div className="fixed inset-0 z-[1001] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={t("calendar.closeDialog")}
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-navy-950/55 backdrop-blur-sm motion-safe:animate-cal-fade"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border p-6 shadow-pop outline-none motion-safe:animate-cal-pop ${panelCls}`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("calendar.close")}
            className={`-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 transition ${closeBtnCls}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
