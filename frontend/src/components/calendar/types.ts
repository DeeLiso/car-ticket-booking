import type { WeekStart } from "@/utils/calendarUtils";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  /** Local `YYYY-MM-DD`. */
  date: string;
  /** `HH:mm`. */
  startTime?: string;
  /** `HH:mm`. */
  endTime?: string;
  location?: string;
  createdAt: number;
}

export interface CalendarNote {
  date: string;
  text: string;
  updatedAt: number;
}

export type CalendarTheme = "light" | "dark";

export interface CalendarSettings {
  weekStartsOn: WeekStart;
  use24Hour: boolean;
  theme: CalendarTheme;
}

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  weekStartsOn: 1,
  use24Hour: false,
  theme: "light",
};

export const CALENDAR_STORAGE_KEYS = {
  events: "tmax.calendar.events",
  notes: "tmax.calendar.notes",
  settings: "tmax.calendar.settings",
} as const;
