import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BookingOut } from "@/types";
import { adminApi } from "@/services/endpoints";

const SEEN_KEY = "tmax.adminBookingsLastSeen";
const ALARM_KEY = "tmax.adminBookingsAlarm";
const POLL_MS = 12000;

let audioCtx: AudioContext | null = null;

function playAlarm() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const start = audioCtx.currentTime;
    [0, 0.28].forEach((offset, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 880 : 1320;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.22);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.24);
    });
  } catch {
    /* audio unavailable - ignore */
  }
}

function readSeen(): number {
  try {
    const stored = localStorage.getItem(SEEN_KEY);
    if (stored && Number.isFinite(Number(stored))) return Number(stored);
    const now = Date.now();
    localStorage.setItem(SEEN_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function readAlarm(): boolean {
  try {
    return localStorage.getItem(ALARM_KEY) !== "off";
  } catch {
    return true;
  }
}

// A tiny shared store so every mounted instance (sidebar badge + alert page)
// agrees on the last-seen marker and alarm toggle.
type Listener = () => void;
const listeners = new Set<Listener>();
let seenMs = readSeen();
let alarmEnabled = readAlarm();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSeen(ms: number) {
  seenMs = ms;
  try {
    localStorage.setItem(SEEN_KEY, String(ms));
  } catch {
    /* ignore */
  }
  emit();
}

function setAlarm(value: boolean) {
  alarmEnabled = value;
  try {
    localStorage.setItem(ALARM_KEY, value ? "on" : "off");
  } catch {
    /* ignore */
  }
  emit();
}

interface Options {
  /** Poll the feed. Set false for non-admin shells. */
  enabled?: boolean;
  /** Play a chime when a genuinely new booking arrives. */
  sound?: boolean;
}

export interface BookingAlerts {
  newCount: number;
  items: BookingOut[];
  latestCreatedAt: string | null;
  seenMs: number;
  alarmEnabled: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  markSeen: () => void;
  toggleAlarm: () => void;
}

export function useBookingAlerts({ enabled = true, sound = false }: Options = {}): BookingAlerts {
  const seenMsValue = useSyncExternalStore(subscribe, () => seenMs, () => seenMs);
  const alarmOn = useSyncExternalStore(subscribe, () => alarmEnabled, () => alarmEnabled);

  const query = useQuery({
    queryKey: ["admin-booking-feed", seenMsValue],
    queryFn: () => adminApi.bookingsFeed(new Date(seenMsValue).toISOString()),
    refetchInterval: POLL_MS,
    enabled,
  });

  const newCount = query.data?.new_count ?? 0;

  const prevCount = useRef(0);
  useEffect(() => {
    if (newCount > prevCount.current && sound && alarmOn) playAlarm();
    prevCount.current = newCount;
  }, [newCount, alarmOn, sound]);

  const markSeen = useCallback(() => setSeen(Date.now()), []);
  const toggleAlarm = useCallback(() => setAlarm(!alarmEnabled), []);

  return {
    newCount,
    items: query.data?.items ?? [],
    latestCreatedAt: query.data?.latest_created_at ?? null,
    seenMs: seenMsValue,
    alarmEnabled: alarmOn,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
    markSeen,
    toggleAlarm,
  };
}
