import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, Sparkles, WifiOff, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shows a "new version available" prompt and an offline-ready confirmation.
 *  Registration is handled here (see `injectRegister: false` in vite config). */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Poll for a new service worker every hour while the tab stays open.
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => setOfflineReady(false), 4000);
    return () => window.clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className="fixed inset-x-0 bottom-20 z-[1001] px-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96 lg:px-0">
        <div
          role="dialog"
          aria-label={t("pwa.update.available")}
          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-navy-900/95 p-4 text-white shadow-pop backdrop-blur-md animate-cal-in"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-fade">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t("pwa.update.available")}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              {t("pwa.update.description")}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateServiceWorker(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-cta transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("pwa.update.reload")}
              </button>
              <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {t("pwa.update.later")}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label={t("pwa.update.dismissAria")}
            className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 bottom-20 z-[1001] mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-navy-900/95 px-4 py-3 text-sm text-white shadow-pop backdrop-blur-md animate-cal-in lg:bottom-4"
      >
        <WifiOff className="h-4 w-4 shrink-0 text-accent-300" aria-hidden="true" />
        <p className="flex-1 text-xs leading-relaxed text-white/80">
          {t("pwa.update.ready")}
        </p>
        <button
          type="button"
          onClick={() => setOfflineReady(false)}
          aria-label={t("pwa.update.readyDismiss")}
          className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return null;
}
