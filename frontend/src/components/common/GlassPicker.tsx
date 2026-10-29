import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// Shared frosted-glass trigger styling for the filter controls.
const GLASS_TRIGGER =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-white/25 bg-white/15 px-3.5 py-2.5 text-left text-sm text-white backdrop-blur-md outline-none transition hover:bg-white/20 focus:border-white/60 focus:bg-white/25 focus:ring-2 focus:ring-white/30";

const GLASS_PANEL =
  "absolute z-50 mt-2 overflow-hidden rounded-2xl border border-white/15 bg-navy-900/80 p-1.5 shadow-2xl shadow-navy-950/50 backdrop-blur-xl";

function PanelSheen() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
    />
  );
}

export interface GlassOption {
  value: string;
  label: string;
}

interface GlassSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: GlassOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  ariaLabel,
  className = "",
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = options[active];
      if (o) commit(o.value);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={GLASS_TRIGGER}
      >
        <span className={`truncate ${selected ? "text-white" : "text-white/50"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className={GLASS_PANEL}>
          <PanelSheen />
          <ul
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="seat-scroll max-h-64 overflow-y-auto"
          >
            {options.map((o, i) => {
              const isSel = o.value === value;
              const isActive = i === active;
              return (
                <li key={o.value || "__all"} role="option" aria-selected={isSel}>
                  <button
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => commit(o.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      isSel
                        ? "bg-white/20 font-semibold text-white"
                        : isActive
                          ? "bg-white/10 text-white"
                          : "text-white/85 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {isSel && <Check className="h-4 w-4 shrink-0 text-orange-300" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKey(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

interface GlassDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function GlassDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  ariaLabel,
  className = "",
}: GlassDatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseKey(value);
  const [view, setView] = useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openMenu = () => {
    const base = selected ?? new Date();
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  const todayKey = toKey(new Date());
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));

  const pick = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={GLASS_TRIGGER}
      >
        <span className={`truncate ${selected ? "text-white" : "text-white/50"}`}>
          {selected
            ? selected.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : placeholder}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-white/70" />
      </button>

      {open && (
        <div className={`${GLASS_PANEL} w-72 max-w-[calc(100vw-2rem)] p-3`}>
          <PanelSheen />
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              aria-label="Previous month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              aria-label="Next month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase text-white/50"
              >
                {w}
              </span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`pad-${i}`} className="h-8" />;
              const key = toKey(d);
              const isSel = key === value;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  aria-label={d.toLocaleDateString("en-US", { dateStyle: "full" })}
                  aria-pressed={isSel}
                  className={`flex h-8 items-center justify-center rounded-lg text-sm transition ${
                    isSel
                      ? "bg-orange-500 font-semibold text-white shadow-cta"
                      : isToday
                        ? "text-white ring-1 ring-inset ring-white/40 hover:bg-white/10"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => pick(todayKey)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-200 transition hover:bg-white/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => pick("")}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
