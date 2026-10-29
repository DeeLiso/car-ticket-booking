import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tmax.pwa.installDismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia?.("(display-mode: standalone)").matches || iosStandalone;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** A dismissible "Add to Home Screen" banner. Handles Chrome/Edge's
 *  `beforeinstallprompt` and falls back to a manual hint on iOS Safari,
 *  which has no such event. */
export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setIosHint(false);
      setVisible(true);
    }
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    let timer: number | undefined;
    if (isIOS && isSafari) {
      timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) {
      setIosHint(true);
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-[1001] px-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96 lg:px-0">
      <div
        role="dialog"
        aria-label="Install app"
        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-navy-900/95 p-4 text-white shadow-pop backdrop-blur-md animate-cal-in"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-fade">
          <Download className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("pwa.install.title")}</p>
          {iosHint ? (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              {t("pwa.install.iosPrompt")}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              {t("pwa.install.chromePrompt")}
            </p>
          )}
          {!iosHint ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={install}
                className="min-h-11 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-white shadow-cta transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              >
                {t("pwa.install.install")}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="min-h-11 rounded-xl px-4 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {t("pwa.install.notNow")}
              </button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("pwa.install.dismissAria")}
          className="-m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
