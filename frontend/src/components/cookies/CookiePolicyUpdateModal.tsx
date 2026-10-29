import { useEffect, useRef } from "react";
import { Check, Cookie as CookieIcon, ExternalLink, Settings2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/store/cookieConsent";
import { CookiePreferenceSettings } from "@/components/cookies/CookiePreferenceSettings";

type View = "notice" | "preferences";

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function CookieModalDialog({ view }: { view: View }) {
  const { t } = useTranslation();
  const {
    policy,
    saving,
    acknowledges,
    acceptAll,
    rejectOptional,
    openPreferences,
    closePreferences,
    dismissNotice,
  } = useCookieConsent();

  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => (view === "preferences" ? closePreferences() : dismissNotice());
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm animate-cal-fade" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
        aria-describedby="cookie-modal-desc"
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1733] via-[#0f1b38] to-[#16244a] text-white shadow-pop outline-none animate-cal-pop"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/25 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-orange-500/15 blur-[90px]" />

        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-xl text-navy-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          aria-label={view === "preferences" ? t("cookies.modal.closePreferences") : t("cookies.modal.closeNotice")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative max-h-[85vh] overflow-y-auto p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-center gap-4">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-glow">
              <span className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-md" aria-hidden="true" />
              {view === "preferences" ? (
                <Settings2 className="relative h-7 w-7 text-brand-200" aria-hidden="true" />
              ) : (
                <CookieIcon className="relative h-7 w-7 text-brand-200" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 pr-10">
              <h2 id="cookie-modal-title" className="font-display text-xl font-extrabold leading-tight">
                {view === "preferences" ? t("cookies.modal.preferencesTitle") : t("cookies.modal.noticeTitle")}
              </h2>
              <p id="cookie-modal-desc" className="mt-0.5 text-sm text-navy-200">
                {view === "preferences" ? t("cookies.modal.preferencesSubtitle") : t("cookies.modal.noticeSubtitle")}
              </p>
            </div>
          </div>

          {view === "notice" ? (
            <>
              <p className="mt-5 text-sm leading-relaxed text-navy-200">
                {t("cookies.modal.description")}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-navy-100">
                  <CookieIcon className="h-3.5 w-3.5 text-brand-200" aria-hidden="true" />
                  {t("cookies.modal.policyVersion")} {policy?.version ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-navy-100">
                  {t("cookies.modal.effective")} {formatDate(policy?.effective_date) || "—"}
                </span>
              </div>

              <Link
                to="/cookies"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-200 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                {t("cookies.modal.readPolicy")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>

              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={acceptAll}
                  disabled={saving}
                  className="btn-primary inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:opacity-70"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t("cookies.modal.acceptAll")}
                </button>
                <button
                  type="button"
                  onClick={openPreferences}
                  disabled={saving}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
                >
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  {t("cookies.modal.customize")}
                </button>
                <button
                  type="button"
                  onClick={rejectOptional}
                  disabled={saving}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-navy-200 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
                >
                  {t("cookies.modal.rejectOptional")}
                </button>
                <button
                  type="button"
                  onClick={acknowledges}
                  disabled={saving}
                  className="mx-auto block min-h-11 px-4 text-xs font-semibold text-navy-300 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
                >
                  {t("cookies.modal.acknowledge")}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5">
              <CookiePreferenceSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CookiePolicyUpdateModal() {
  const { policy, needsAck, preferencesOpen } = useCookieConsent();

  if (preferencesOpen) return <CookieModalDialog view="preferences" />;
  if (needsAck && policy) return <CookieModalDialog view="notice" />;
  return null;
}
