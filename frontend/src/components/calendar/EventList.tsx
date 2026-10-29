import { useTranslation } from "react-i18next";
import { CalendarOff, Pencil, Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/components/calendar/types";
import { formatTimeRange } from "@/utils/calendarUtils";

/** Events for the currently selected day, shown on the glass card. */
export function EventList({
  events,
  use24Hour,
  onEdit,
  onDelete,
}: {
  events: CalendarEvent[];
  use24Hour: boolean;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-3 text-sm text-white/55 ring-1 ring-inset ring-white/[0.06]">
        <CalendarOff className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
        <span>{t("calendar.eventList.empty")}</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const time = formatTimeRange(event.startTime, event.endTime, use24Hour);
        return (
          <li
            key={event.id}
            className="relative flex items-start gap-3 overflow-hidden rounded-2xl bg-white/[0.06] py-2.5 pl-4 pr-3 ring-1 ring-inset ring-white/10 backdrop-blur transition hover:bg-white/[0.09]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#315EFB] via-[#805AD5] to-[#F5B942]"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{event.title}</p>
              {(time || event.location) && (
                <p className="truncate text-xs text-white/60">
                  {time}
                  {time && event.location ? " · " : ""}
                  {event.location}
                </p>
              )}
              {event.description && (
                <p className="mt-1 line-clamp-2 text-xs text-white/60">{event.description}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onEdit(event)}
                aria-label={t("calendar.editEventAria", { title: event.title })}
                className="-m-1 flex h-11 w-11 items-center justify-center rounded-full p-1.5 text-white/70 transition hover:bg-[#F5B942]/15 hover:text-[#F5B942]"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(event.id)}
                aria-label={t("calendar.deleteEventAria", { title: event.title })}
                className="-m-1 flex h-11 w-11 items-center justify-center rounded-full p-1.5 text-white/70 transition hover:bg-red-500/30 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
