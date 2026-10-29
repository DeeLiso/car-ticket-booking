import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Frosted-glass passenger count picker — a custom replacement for a native
 * <select>. Keyboard operable (Arrow keys, Enter, Escape).
 */
export function PassengerSelect({
  id,
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
  ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const uid = useId();
  const triggerId = id ?? `${uid}-trigger`;
  const listboxId = `${uid}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const aria = ariaLabel ?? t("forms.passengers");
  const label = (n: number) => t("forms.passengerCount", { count: n });

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setHighlight(Math.max(0, options.indexOf(value)));
    setOpen(true);
  }

  function choose(next: number) {
    onChange(next);
    setOpen(false);
  }

  function move(next: number) {
    const clamped = Math.max(0, Math.min(next, options.length - 1));
    setHighlight(clamped);
    const option = options[clamped];
    if (option !== undefined) {
      document.getElementById(`${uid}-opt-${option}`)?.scrollIntoView({ block: "nearest" });
    }
  }

  const activeId = open && options[highlight] !== undefined ? `${uid}-opt-${options[highlight]}` : undefined;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        aria-label={aria}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) openMenu();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_24px_-18px_rgba(15,27,56,0.6)] backdrop-blur-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#e9eefb] dark:shadow-none ${
          open
            ? "border-brand-400/70 bg-white/75 ring-2 ring-brand-500/25 dark:border-brand-400/60 dark:bg-white/10"
            : "border-white/70 bg-white/55 hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
          <span className="truncate">{label(value)}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-navy-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 w-full min-w-[13rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/45 shadow-pop backdrop-blur-2xl motion-safe:animate-cal-pop dark:border-white/10 dark:from-white/[0.1] dark:to-white/[0.03]">
          <p className="px-3.5 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-navy-400 dark:text-white/40">
            {t("forms.passengers")}
          </p>
          <div
            id={listboxId}
            role="listbox"
            aria-label={aria}
            ref={listRef}
            tabIndex={-1}
            aria-activedescendant={activeId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                move(highlight + 1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                move(highlight - 1);
              } else if (event.key === "Enter") {
                event.preventDefault();
                const option = options[highlight];
                if (option !== undefined) choose(option);
              }
            }}
            className="max-h-60 overflow-y-auto p-2 pt-1 outline-none"
          >
            {options.map((n, index) => {
              const isSelected = n === value;
              const isActive = index === highlight;
              return (
                <button
                  key={n}
                  id={`${uid}-opt-${n}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(n)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "bg-brand-500/15 text-brand-700 dark:bg-brand-500/25 dark:text-white"
                      : "text-navy-700 hover:bg-white/70 dark:text-[#c6d3ec] dark:hover:bg-white/10"
                  }`}
                >
                  <Users className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300" />
                  <span className="min-w-0 flex-1 truncate font-medium">{label(n)}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
