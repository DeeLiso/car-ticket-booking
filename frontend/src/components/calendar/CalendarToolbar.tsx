import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import type { CalendarView } from "@/hooks/useCalendar";

/**
 * Top row of the card: the Weekly/Monthly segmented control on the left and
 * navigation + settings on the right. Rendered on the blue-grey gradient card,
 * so everything is glassy white.
 */
export function CalendarToolbar({
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onOpenSettings,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();
  const navBtn =
    "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/10 backdrop-blur transition hover:bg-[#315EFB]/35 hover:ring-white/20 active:scale-95";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="tablist"
        aria-label={t("calendar.toolbar.view")}
        className="inline-flex items-center rounded-full bg-white/10 p-1 ring-1 ring-inset ring-white/10 backdrop-blur"
      >
        {(["weekly", "monthly"] as const).map((key) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onViewChange(key)}
              className={`min-h-10 rounded-full px-4 py-1.5 text-sm font-semibold transition sm:px-5 ${
                active
                  ? "bg-[#F3F6FC] text-[#080D20] shadow-[0_4px_14px_rgba(2,6,23,0.35)]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {key === "weekly" ? t("calendar.toolbar.weekly") : t("calendar.toolbar.monthly")}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className={navBtn} onClick={onPrev} aria-label={t("calendar.toolbar.prevPeriod")}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button type="button" className={navBtn} onClick={onNext} aria-label={t("calendar.toolbar.nextPeriod")}>
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="min-h-10 rounded-full border border-[#F5B942]/40 bg-[#F5B942]/10 px-3.5 py-1.5 text-sm font-semibold text-[#F5B942] backdrop-blur transition hover:bg-[#F5B942]/20 active:scale-95"
        >
          {t("calendar.today")}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t("calendar.settings")}
          className={navBtn}
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
