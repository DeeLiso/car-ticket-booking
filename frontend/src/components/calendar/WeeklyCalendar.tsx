import { useTranslation } from "react-i18next";
import { isSameDay, isToday, toISODate } from "@/utils/calendarUtils";

/** Horizontal seven-day strip used in Weekly mode. */
export function WeeklyCalendar({
  dates,
  selected,
  onSelect,
  countEvents = () => 0,
}: {
  dates: Date[];
  selected: Date;
  onSelect: (date: Date) => void;
  countEvents?: (date: Date) => number;
}) {
  const { t } = useTranslation();
  const selectedMonth = selected.getMonth();
  const selectedYear = selected.getFullYear();

  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="Week">
      {dates.map((date) => {
        const active = isSameDay(date, selected);
        const today = isToday(date);
        const inMonth = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
        const count = countEvents(date);
        const label = `${t(`calendar.weekdays.long.${date.getDay()}`)}, ${t(
          `calendar.months.${date.getMonth()}`,
        )} ${date.getDate()}`;

        return (
          <button
            key={toISODate(date)}
            type="button"
            onClick={() => onSelect(date)}
            aria-pressed={active}
            aria-current={active ? "date" : undefined}
            aria-label={label}
            className={`group relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 transition sm:gap-1.5 sm:py-3 ${
              active ? "bg-white/10 ring-1 ring-[#F5B942]/40" : "hover:bg-[#315EFB]/15"
            }`}
          >
            <span
              className={`text-[9px] font-semibold uppercase tracking-wide sm:text-xs ${
                active ? "text-[#F5B942]" : inMonth ? "text-white/65" : "text-white/30"
              }`}
            >
              {t(`calendar.weekdays.short.${date.getDay()}`)}
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition sm:h-10 sm:w-10 sm:text-base ${
                active
                  ? "bg-gradient-to-br from-[#F5B942] to-[#E58F10] font-bold text-[#080D20] shadow-[0_6px_18px_-6px_rgba(245,185,66,0.8)]"
                  : today
                    ? "bg-[#F5B942]/10 text-[#F5B942] ring-1 ring-[#F5B942]/70"
                    : inMonth
                      ? "text-white/85 group-hover:bg-[#315EFB]/25"
                      : "text-white/35 group-hover:bg-white/10"
              }`}
            >
              {date.getDate()}
            </span>
            {count > 1 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0.5 top-0.5 min-w-[15px] rounded-full bg-white/20 px-1 text-[9px] font-bold leading-[15px] text-white"
              >
                {count}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full bg-[#55D6FF] transition ${
                  count > 0 ? "opacity-90" : "opacity-0"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
