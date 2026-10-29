import { useTranslation } from "react-i18next";
import { MonthlyGrid } from "@/components/calendar/MonthlyGrid";
import { type WeekStart } from "@/utils/calendarUtils";

/** Monthly mode: a browsing-month caption above the shared day matrix. */
export function MonthlyCalendar({
  month,
  weekStart,
  selected,
  onSelect,
  countEvents,
}: {
  month: Date;
  weekStart: WeekStart;
  selected: Date;
  onSelect: (date: Date) => void;
  countEvents?: (date: Date) => number;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-display text-lg font-semibold sm:text-xl">
          {t(`calendar.months.${month.getMonth()}`)}{" "}
          <span className="text-white/60">{month.getFullYear()}</span>
        </p>
      </div>
      <MonthlyGrid
        month={month}
        weekStart={weekStart}
        selected={selected}
        onSelect={onSelect}
        variant="glass"
        countEvents={countEvents}
      />
    </div>
  );
}
