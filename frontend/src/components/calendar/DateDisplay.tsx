import { useTranslation } from "react-i18next";

/** Large "August … 23" headline that tracks the selected date. */
export function DateDisplay({ date }: { date: Date }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="font-display text-3xl font-semibold leading-none tracking-tight sm:text-4xl lg:text-5xl">
          {t(`calendar.months.${date.getMonth()}`)}
        </p>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/70 sm:text-xs">
          {t(`calendar.weekdays.long.${date.getDay()}`)} · {date.getFullYear()}
        </p>
      </div>
      <div
        key={date.toDateString()}
        className="shrink-0 font-display text-6xl font-light leading-none tabular-nums drop-shadow-[0_0_20px_rgba(245,185,66,0.18)] motion-safe:animate-cal-pop sm:text-7xl lg:text-8xl"
      >
        {date.getDate()}
      </div>
    </div>
  );
}
