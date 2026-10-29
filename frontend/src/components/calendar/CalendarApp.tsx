import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, PenLine, Plus, StickyNote } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar";
import { DateDisplay } from "@/components/calendar/DateDisplay";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { MonthlyCalendar } from "@/components/calendar/MonthlyCalendar";
import { EventList } from "@/components/calendar/EventList";
import { EventModal } from "@/components/calendar/EventModal";
import { NoteEditor } from "@/components/calendar/NoteEditor";
import { SettingsModal } from "@/components/calendar/SettingsModal";
import type { CalendarEvent } from "@/components/calendar/types";
import { getWeekDates, toISODate } from "@/utils/calendarUtils";

type ModalState =
  | { kind: "none" }
  | { kind: "event"; event: CalendarEvent | null }
  | { kind: "note" }
  | { kind: "settings" };

/** The complete, self-contained calendar experience. */
export function CalendarApp() {
  const { t } = useTranslation();
  const cal = useCalendar();
  const dark = cal.settings.theme === "dark";
  const [modal, setModal] = useState<ModalState>({ kind: "none" });

  const weekDates = useMemo(
    () => getWeekDates(cal.weekAnchor, cal.settings.weekStartsOn),
    [cal.weekAnchor, cal.settings.weekStartsOn],
  );

  const countEvents = useCallback(
    (date: Date) => cal.eventsByDate.get(toISODate(date))?.length ?? 0,
    [cal.eventsByDate],
  );

  const onPrev = () => (cal.view === "weekly" ? cal.goWeek(-1) : cal.goMonth(-1));
  const onNext = () => (cal.view === "weekly" ? cal.goWeek(1) : cal.goMonth(1));

  function handleSaveEvent(draft: Omit<CalendarEvent, "id" | "createdAt">) {
    if (modal.kind === "event" && modal.event) cal.updateEvent(modal.event.id, draft);
    else cal.addEvent(draft);
  }

  return (
    <div
      id="main"
      className={`relative min-h-screen overflow-hidden py-10 outline-none sm:py-16 ${
        dark ? "bg-[#080D20]" : "bg-cream"
      }`}
    >
      {/* Ambient blue / violet / gold glow behind the card */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
        <div className="relative h-[520px] w-[min(92vw,860px)]">
          <span
            className={`absolute -left-10 top-10 h-72 w-72 rounded-full blur-[110px] ${
              dark ? "bg-brand-600/30" : "bg-brand-500/25"
            }`}
          />
          <span
            className={`absolute right-0 top-0 h-64 w-64 rounded-full blur-[110px] ${
              dark ? "bg-[#805AD5]/25" : "bg-[#805AD5]/20"
            }`}
          />
          <span
            className={`absolute bottom-0 left-1/3 h-56 w-56 rounded-full blur-[110px] ${
              dark ? "bg-[#F5B942]/15" : "bg-[#F5B942]/20"
            }`}
          />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[788px] px-4 sm:px-6">
        <CalendarHeader dark={dark} />

        <div className="mt-6 motion-safe:animate-cal-in sm:mt-8">
          <section
            className="relative flex min-h-[600px] flex-col overflow-hidden rounded-[2rem] border border-white/10 p-5 text-white shadow-[0_30px_80px_-30px_rgba(2,6,23,0.9)] sm:min-h-[660px] sm:rounded-[2.75rem] sm:p-7 lg:p-9"
            style={{
              background:
                "linear-gradient(135deg,#080D20 0%,#101B3C 52%,#1D2F9E 100%)",
            }}
          >
            <div aria-hidden="true" className="calendar-aurora">
              <span className="calendar-glow calendar-glow--blue" />
              <span className="calendar-glow calendar-glow--violet" />
              <span className="calendar-glow calendar-glow--gold" />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/10 via-transparent to-transparent"
            />

            <div className="relative z-10 flex flex-1 flex-col">
              <CalendarToolbar
                view={cal.view}
                onViewChange={cal.setView}
                onPrev={onPrev}
                onNext={onNext}
                onToday={cal.goToday}
                onOpenSettings={() => setModal({ kind: "settings" })}
              />

              <div className="mt-6 sm:mt-8">
                <DateDisplay date={cal.selectedDate} />
              </div>

              <div className="mt-5 sm:mt-7">
                {cal.view === "weekly" ? (
                  <WeeklyCalendar
                    dates={weekDates}
                    selected={cal.selectedDate}
                    onSelect={cal.selectDate}
                    countEvents={countEvents}
                  />
                ) : (
                  <MonthlyCalendar
                    month={cal.visibleMonth}
                    weekStart={cal.settings.weekStartsOn}
                    selected={cal.selectedDate}
                    onSelect={cal.selectDate}
                    countEvents={countEvents}
                  />
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  {t("calendar.events")}
                </h3>
                <div className="mt-2">
                  <EventList
                    events={cal.selectedEvents}
                    use24Hour={cal.settings.use24Hour}
                    onEdit={(event) => setModal({ kind: "event", event })}
                    onDelete={cal.removeEvent}
                  />
                </div>
              </div>

              {cal.selectedNote && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#F5B942]/10 px-3 py-2.5 ring-1 ring-inset ring-[#F5B942]/20 backdrop-blur">
                  <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-[#F5B942]" />
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-white/90">
                    {cal.selectedNote.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "note" })}
                    aria-label={t("calendar.editNote")}
                    className="-m-1.5 flex h-11 w-11 items-center justify-center rounded-full p-1.5 text-[#F5B942]/80 transition hover:bg-[#F5B942]/15 hover:text-[#F5B942]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setModal({ kind: "note" })}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/15"
                >
                  <PenLine className="h-4 w-4" />
                  {cal.selectedNote ? t("calendar.editNote") : t("calendar.addNote")}
                </button>

                <button
                  type="button"
                  onClick={() => setModal({ kind: "event", event: null })}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-cta ring-1 ring-inset ring-accent-300/60 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-cta-lg active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  {t("calendar.newEvent")}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {modal.kind === "event" && (
        <EventModal
          onClose={() => setModal({ kind: "none" })}
          dark={dark}
          defaultDate={cal.selectedDateKey}
          event={modal.event}
          onSave={handleSaveEvent}
          onDelete={cal.removeEvent}
        />
      )}
      {modal.kind === "note" && (
        <NoteEditor
          onClose={() => setModal({ kind: "none" })}
          dark={dark}
          date={cal.selectedDateKey}
          note={cal.selectedNote}
          onSave={(text) => cal.saveNote(cal.selectedDateKey, text)}
          onDelete={() => cal.saveNote(cal.selectedDateKey, "")}
        />
      )}
      {modal.kind === "settings" && (
        <SettingsModal
          onClose={() => setModal({ kind: "none" })}
          dark={dark}
          settings={cal.settings}
          onChange={cal.updateSettings}
          onClear={cal.clearAll}
        />
      )}
    </div>
  );
}
