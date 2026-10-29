import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarDays, Home } from "lucide-react";
import { dayOfYear, daysInYear } from "@/utils/calendarUtils";

/** "Daily Design Challenge" / "Day X / Y" pills above the calendar card. */
export function CalendarHeader({ dark = false }: { dark?: boolean }) {
  const { t } = useTranslation();
  const now = new Date();
  const day = dayOfYear(now);
  const total = daysInYear(now.getFullYear());

  const pillBase =
    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition";
  const pillLight =
    "border-navy-200 bg-white text-navy-700 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700";
  const pillDark =
    "border-[#2a3a5c] bg-white/[0.07] text-[#c6d3ec] backdrop-blur hover:-translate-y-0.5 hover:border-brand-400/60 hover:text-white";

  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className={`${pillBase} ${dark ? pillDark : pillLight}`}>
        <CalendarDays className={`h-4 w-4 ${dark ? "text-[#8fa0c4]" : "text-brand-600"}`} />
        <span className="font-semibold">{t("calendar.header.challenge")}</span>
      </span>

      <div className="flex items-center gap-3">
        <span className={`${pillBase} tabular-nums ${dark ? pillDark : pillLight}`}>
          {t("calendar.header.dayOf", { day, total })}
        </span>
        <Link
          to="/"
          aria-label={t("calendar.header.backToBooking")}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
            dark
              ? "border-[#2a3a5c] bg-white/[0.07] text-[#c6d3ec] hover:border-brand-400/60 hover:text-white"
              : "border-navy-200 bg-white text-navy-700 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
          }`}
        >
          <Home className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
