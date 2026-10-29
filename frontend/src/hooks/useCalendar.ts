import { useCallback, useMemo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  addDays,
  addMonths,
  makeId,
  startOfMonth,
  toISODate,
} from "@/utils/calendarUtils";
import type { CalendarEvent, CalendarNote, CalendarSettings } from "@/components/calendar/types";
import { CALENDAR_STORAGE_KEYS, DEFAULT_CALENDAR_SETTINGS } from "@/components/calendar/types";

export type CalendarView = "weekly" | "monthly";

export function useCalendar() {
  const initialToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState<CalendarView>("weekly");
  const [selectedDate, setSelectedDate] = useState<Date>(initialToday);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(initialToday));
  const [weekAnchor, setWeekAnchor] = useState<Date>(initialToday);

  const [events, setEvents] = useLocalStorage<CalendarEvent[]>(CALENDAR_STORAGE_KEYS.events, []);
  const [notes, setNotes] = useLocalStorage<Record<string, CalendarNote>>(
    CALENDAR_STORAGE_KEYS.notes,
    {},
  );
  const [settings, setSettings] = useLocalStorage<CalendarSettings>(
    CALENDAR_STORAGE_KEYS.settings,
    DEFAULT_CALENDAR_SETTINGS,
  );

  /** Keep the selection and every dependent view in sync. */
  const selectDate = useCallback((next: Date) => {
    setSelectedDate(next);
    setWeekAnchor(next);
    setVisibleMonth(startOfMonth(next));
  }, []);

  const goWeek = useCallback(
    (delta: number) => selectDate(addDays(selectedDate, delta * 7)),
    [selectDate, selectedDate],
  );

  const goMonth = useCallback(
    (delta: number) => setVisibleMonth(addMonths(visibleMonth, delta)),
    [visibleMonth],
  );

  const goToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    selectDate(now);
  }, [selectDate]);

  const addEvent = useCallback(
    (input: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent => {
      const event: CalendarEvent = { ...input, id: makeId(), createdAt: Date.now() };
      setEvents((prev) => [...prev, event]);
      return event;
    },
    [setEvents],
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, "id" | "createdAt">>) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [setEvents],
  );

  const removeEvent = useCallback(
    (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id)),
    [setEvents],
  );

  const saveNote = useCallback(
    (date: string, text: string) => {
      setNotes((prev) => {
        const draft = { ...prev };
        if (text.trim()) draft[date] = { date, text: text.trim(), updatedAt: Date.now() };
        else delete draft[date];
        return draft;
      });
    },
    [setNotes],
  );

  const updateSettings = useCallback(
    (patch: Partial<CalendarSettings>) => setSettings((prev) => ({ ...prev, ...patch })),
    [setSettings],
  );

  const clearAll = useCallback(() => {
    setEvents([]);
    setNotes({});
  }, [setEvents, setNotes]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return map;
  }, [events]);

  const selectedDateKey = toISODate(selectedDate);

  return {
    view,
    setView,
    selectedDate,
    selectedDateKey,
    visibleMonth,
    setSelectedMonth: setVisibleMonth,
    weekAnchor,
    selectDate,
    goWeek,
    goMonth,
    goToday,
    events,
    eventsByDate,
    selectedEvents: eventsByDate.get(selectedDateKey) ?? [],
    notes,
    selectedNote: notes[selectedDateKey] ?? null,
    addEvent,
    updateEvent,
    removeEvent,
    saveNote,
    settings,
    updateSettings,
    clearAll,
  };
}

export type CalendarStore = ReturnType<typeof useCalendar>;
