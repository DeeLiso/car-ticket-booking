import { createContext, useContext } from "react";
import type { CookieCategoryPrefs, CookieConsentRecord, CookiePolicy, OptionalCookieCategory } from "@/types";

export const DEFAULT_PREFS: CookieCategoryPrefs = {
  functional: false,
  analytics: false,
  marketing: false,
};

export const POLICY_ACK_KEY = "tmax.cookie.policyAck";
export const CONSENT_KEY = "tmax.cookie.consent";
export const VISITOR_ID_KEY = "tmax.cookie.visitorId";

export interface PolicyAck {
  version: string;
  at: string;
}

export interface CookieConsentValue {
  policy?: CookiePolicy;
  policyLoading: boolean;
  policyError: string | null;
  /** The policy-update notice should be shown (visitor hasn't acknowledged). */
  needsAck: boolean;
  /** The preference panel is open (e.g. from the footer "Cookie Settings"). */
  preferencesOpen: boolean;
  /** A save is in flight against the backend. */
  saving: boolean;
  syncError: string | null;
  preferences: CookieCategoryPrefs;
  consent: CookieConsentRecord | null;
  acknowledges: () => void;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (prefs: CookieCategoryPrefs) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  dismissNotice: () => void;
  dismissSyncError: () => void;
  hasConsent: (category: OptionalCookieCategory) => boolean;
}

export const CookieConsentContext = createContext<CookieConsentValue | null>(null);

export function useCookieConsent(): CookieConsentValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within a CookieConsentProvider");
  }
  return ctx;
}

export function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — consent still works for the session */
  }
}

/** Stable per-browser visitor id used to look up saved consent server-side. */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "server-visitor";
  const existing = window.localStorage.getItem(VISITOR_ID_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `v${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  try {
    window.localStorage.setItem(VISITOR_ID_KEY, generated);
  } catch {
    /* ignore */
  }
  return generated;
}
