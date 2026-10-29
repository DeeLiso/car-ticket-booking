import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

/** A slim banner pinned to the top of the viewport while the browser is offline. */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine === false,
  );

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-2 bg-navy-950 px-4 py-1.5 text-xs font-medium text-white/90 shadow-pop animate-cal-fade"
    >
      <WifiOff className="h-3.5 w-3.5 text-accent-300" aria-hidden="true" />
      {t("pwa.offline.message")}
    </div>
  );
}
