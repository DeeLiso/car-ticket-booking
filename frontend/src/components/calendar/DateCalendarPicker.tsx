import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MonthlyGrid } from "@/components/calendar/MonthlyGrid";
import {
  addMonths,
  fromISODate,
  startOfMonth,
  toISODate,
} from "@/utils/calendarUtils";

/**
 * Custom calendar popover used by the booking search form.
 * Drop-in replacement for a native `<input type="date">`: it is a button
 * (so it never triggers native validation) that emits a local `YYYY-MM-DD`.
 */
export function DateCalendarPicker({
  value,
  min,
  onChange,
  ariaLabel,
}: {
  value: string;
  min?: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => startOfMonth(fromISODate(value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const aria = ariaLabel ?? t("forms.departureDate");

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selected = useMemo(() => fromISODate(value), [value]);
  const display = value
    ? selected.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : t("calendar.selectDate");

  const navBtn =
    "rounded-full p-1.5 text-navy-500 transition hover:bg-navy-100 hover:text-navy-800 dark:text-[#8fa0c4] dark:hover:bg-white/10";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={`${uid}-trigger`}
        aria-label={aria}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setMonth(startOfMonth(fromISODate(value)));
          setOpen((o) => !o);
        }}
        className="input flex h-11 cursor-pointer items-center justify-between gap-2 text-left"
      >
        <span className="truncate">{display}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-navy-400" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("calendar.chooseDate")}
          className="absolute left-0 z-40 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-navy-100 bg-white p-4 shadow-pop motion-safe:animate-cal-pop dark:border-[#1f2d49] dark:bg-[#111a2e]"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label={t("calendar.prevMonth")}
              className={navBtn}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-sm font-bold text-navy-800 dark:text-[#e6ecfa]">
              {t(`calendar.months.${month.getMonth()}`)} {month.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label={t("calendar.nextMonth")}
              className={navBtn}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <MonthlyGrid
            month={month}
            weekStart={1}
            selected={selected}
            minDate={min}
            variant="light"
            onSelect={(date) => {
              onChange(toISODate(date));
              setOpen(false);
            }}
          />

          <div className="mt-3 border-t border-navy-100 pt-3 dark:border-[#1f2d49]">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                onChange(toISODate(today));
                setMonth(startOfMonth(today));
                setOpen(false);
              }}
              className="text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              {t("calendar.today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
