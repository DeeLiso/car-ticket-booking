import { useTranslation } from "react-i18next";
import {
  getMonthMatrix,
  isSameDay,
  isToday,
  toISODate,
  type WeekStart,
} from "@/utils/calendarUtils";

export type MonthlyGridVariant = "glass" | "light";

/** The day matrix + weekday headings; reused by Monthly view and the date picker. */
export function MonthlyGrid({
  month,
  weekStart,
  selected,
  onSelect,
  variant = "glass",
  minDate,
  countEvents = () => 0,
  dotClassName,
}: {
  month: Date;
  weekStart: WeekStart;
  selected: Date | null;
  onSelect: (date: Date) => void;
  variant?: MonthlyGridVariant;
  /** Optional `YYYY-MM-DD` floor; earlier days are shown but not selectable. */
  minDate?: string;
  countEvents?: (date: Date) => number;
  /** Optional per-day dot colour; falls back to the variant default. */
  dotClassName?: (date: Date) => string | undefined;
}) {
  const { t } = useTranslation();
  const weeks = getMonthMatrix(month.getFullYear(), month.getMonth(), weekStart);
  const labels = Array.from({ length: 7 }, (_, i) =>
    t(`calendar.weekdays.short.${(weekStart + i) % 7}`),
  );
  const glass = variant === "glass";

  const headingCls = glass
    ? "py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/50 sm:text-xs"
    : "py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-navy-400 sm:text-xs";

  function cellClasses(date: Date, active: boolean, today: boolean): string {
    const outside = date.getMonth() !== month.getMonth();
    if (glass) {
      if (active)
        return "scale-[1.04] bg-gradient-to-br from-[#F5B942] to-[#E58F10] font-bold text-[#080D20] shadow-[0_6px_18px_-6px_rgba(245,185,66,0.8)]";
      if (today) return "bg-[#F5B942]/10 text-[#F5B942] ring-1 ring-[#F5B942]/70";
      if (outside) return "text-white/30 hover:bg-white/10";
      return "text-white/85 hover:bg-[#315EFB]/25";
    }
    if (active) return "bg-brand-600 font-semibold text-white shadow-sm";
    if (today) return "text-brand-700 font-semibold ring-1 ring-brand-400/70";
    if (outside) return "text-navy-300 hover:bg-brand-600/10";
    return "text-navy-700 hover:bg-brand-600/10";
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {labels.map((label, index) => (
          <span key={index} className={headingCls}>
            {label}
          </span>
        ))}
      </div>

      <div className={glass ? "mt-1 space-y-1" : "mt-1 space-y-0.5"}>
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className={glass ? "grid grid-cols-7 gap-1 sm:gap-1.5" : "grid grid-cols-7 gap-1"}
          >
            {week.map((date) => {
              const key = toISODate(date);
              const active = selected ? isSameDay(date, selected) : false;
              const today = isToday(date);
              const count = countEvents(date);
              const blocked = !!minDate && key < minDate;
              const dotCls =
                dotClassName?.(date) ??
                (active ? (glass ? "bg-[#080D20]" : "bg-white") : glass ? "bg-[#55D6FF]" : "bg-brand-600");
              const badgeCls = active
                ? glass
                  ? "bg-[#080D20]/15 text-[#080D20]"
                  : "bg-white/25 text-white"
                : glass
                  ? "bg-white/20 text-white"
                  : "bg-brand-600 text-white";

              return (
                <div key={key} className="flex justify-center">
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => onSelect(date)}
                    aria-pressed={active}
                    aria-current={active ? "date" : undefined}
                    aria-label={`${t(`calendar.weekdays.long.${date.getDay()}`)}, ${t(
                      `calendar.months.${date.getMonth()}`,
                    )} ${date.getDate()}`}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 sm:h-10 sm:w-10 ${cellClasses(
                      date,
                      active,
                      today,
                    )}`}
                  >
                    <span className="pointer-events-none">{date.getDate()}</span>
                    {count > 1 ? (
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute right-0 top-0.5 min-w-[15px] rounded-full px-1 text-[9px] font-bold leading-[15px] ${badgeCls}`}
                      >
                        {count}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute bottom-1 h-1 w-1 rounded-full transition ${dotCls} ${
                          count > 0 ? "opacity-90" : "opacity-0"
                        }`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
