import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, X } from "lucide-react";
import { apiErrorMessage } from "@/services/api";
import { cookiesApi } from "@/services/endpoints";
import type { CookieCategoryPrefs, CookieConsentInput, CookieConsentRecord, OptionalCookieCategory } from "@/types";
import {
  CONSENT_KEY,
  CookieConsentContext,
  DEFAULT_PREFS,
  POLICY_ACK_KEY,
  getVisitorId,
  readStored,
  writeStored,
  type CookieConsentValue,
  type PolicyAck,
} from "@/store/cookieConsent";
import { CookiePolicyUpdateModal } from "@/components/cookies/CookiePolicyUpdateModal";

function initialPreferences(): CookieCategoryPrefs {
  const stored = readStored<CookieConsentRecord>(CONSENT_KEY);
  const categories = stored?.consent_categories;
  if (!categories) return DEFAULT_PREFS;
  return {
    functional: Boolean(categories.functional),
    analytics: Boolean(categories.analytics),
    marketing: Boolean(categories.marketing),
  };
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const policyQuery = useQuery({
    queryKey: ["cookie-policy"],
    queryFn: cookiesApi.policy,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [ack, setAck] = useState<PolicyAck | null>(() => readStored<PolicyAck>(POLICY_ACK_KEY));
  const [consent, setConsent] = useState<CookieConsentRecord | null>(() =>
    readStored<CookieConsentRecord>(CONSENT_KEY),
  );
  const [preferences, setPreferences] = useState<CookieCategoryPrefs>(initialPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const policy = policyQuery.data;
  const needsAck = Boolean(policy && ack?.version !== policy.version && !dismissed);

  const persist = useCallback((payload: CookieConsentInput) => {
    setSaving(true);
    setSyncError(null);
    cookiesApi
      .saveConsent(payload)
      .catch((err) => setSyncError(apiErrorMessage(err)))
      .finally(() => setSaving(false));
  }, []);

  const applyAck = useCallback((version: string) => {
    const record: PolicyAck = { version, at: new Date().toISOString() };
    writeStored(POLICY_ACK_KEY, record);
    setAck(record);
  }, []);

  const applyConsent = useCallback(
    (status: "ACCEPT_ALL" | "REJECT_ALL" | "CUSTOM", categories: CookieCategoryPrefs) => {
      if (!policy) return;
      const record: CookieConsentRecord = {
        visitor_id: getVisitorId(),
        policy_version: policy.version,
        consent_status: status,
        consent_categories: { necessary: true, ...categories },
        consent_at: new Date().toISOString(),
        consent_policy_version: policy.version,
      };
      writeStored(CONSENT_KEY, record);
      setConsent(record);
      setPreferences(categories);
    },
    [policy],
  );

  const acknowledges = useCallback(() => {
    if (!policy) return;
    applyAck(policy.version);
    setPreferencesOpen(false);
    persist({
      visitor_id: getVisitorId(),
      policy_version: policy.version,
      acknowledge: true,
      source: "banner",
    });
  }, [applyAck, persist, policy]);

  const acceptAll = useCallback(() => {
    if (!policy) return;
    const categories: CookieCategoryPrefs = { functional: true, analytics: true, marketing: true };
    applyConsent("ACCEPT_ALL", categories);
    applyAck(policy.version);
    setPreferencesOpen(false);
    persist({
      visitor_id: getVisitorId(),
      policy_version: policy.version,
      acknowledge: true,
      consent_status: "ACCEPT_ALL",
      categories,
      source: "banner",
    });
  }, [applyAck, applyConsent, persist, policy]);

  const rejectOptional = useCallback(() => {
    if (!policy) return;
    const categories: CookieCategoryPrefs = { functional: false, analytics: false, marketing: false };
    applyConsent("REJECT_ALL", categories);
    applyAck(policy.version);
    setPreferencesOpen(false);
    persist({
      visitor_id: getVisitorId(),
      policy_version: policy.version,
      acknowledge: true,
      consent_status: "REJECT_ALL",
      categories,
      source: "banner",
    });
  }, [applyAck, applyConsent, persist, policy]);

  const savePreferences = useCallback(
    (next: CookieCategoryPrefs) => {
      if (!policy) return;
      const status =
        next.functional && next.analytics && next.marketing
          ? "ACCEPT_ALL"
          : !next.functional && !next.analytics && !next.marketing
            ? "REJECT_ALL"
            : "CUSTOM";
      applyConsent(status, next);
      applyAck(policy.version);
      setPreferencesOpen(false);
      persist({
        visitor_id: getVisitorId(),
        policy_version: policy.version,
        acknowledge: true,
        consent_status: status,
        categories: next,
        source: "preferences",
      });
    },
    [applyAck, applyConsent, persist, policy],
  );

  const hasConsent = useCallback(
    (category: OptionalCookieCategory) => Boolean(consent?.consent_categories?.[category]),
    [consent],
  );

  const value = useMemo<CookieConsentValue>(
    () => ({
      policy,
      policyLoading: policyQuery.isLoading,
      policyError: policyQuery.error ? apiErrorMessage(policyQuery.error) : null,
      needsAck,
      preferencesOpen,
      saving,
      syncError,
      preferences,
      consent,
      acknowledges,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      dismissNotice: () => setDismissed(true),
      dismissSyncError: () => setSyncError(null),
      hasConsent,
    }),
    [
      policy,
      policyQuery.isLoading,
      policyQuery.error,
      needsAck,
      preferencesOpen,
      saving,
      syncError,
      preferences,
      consent,
      acknowledges,
      acceptAll,
      rejectOptional,
      savePreferences,
      hasConsent,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      <CookiePolicyUpdateModal />
      {syncError ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 z-[1001] mx-auto flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-2xl border border-amber-300/40 bg-navy-900/95 px-4 py-3 text-sm text-amber-100 shadow-pop backdrop-blur-md animate-cal-in"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <p className="flex-1 leading-relaxed">
            {t("cookies.banner.syncError")}
            <span className="sr-only"> {syncError}</span>
          </p>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-1 text-amber-200/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label={t("cookies.banner.dismiss")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </CookieConsentContext.Provider>
  );
}
