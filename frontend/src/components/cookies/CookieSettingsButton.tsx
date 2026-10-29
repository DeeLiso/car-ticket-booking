import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/store/cookieConsent";

export function CookieSettingsButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();
  return (
    <button
      type="button"
      onClick={openPreferences}
      className={
        className ??
        "inline-flex min-h-11 items-center text-left transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950"
      }
    >
      {t("cookies.settingsButton")}
    </button>
  );
}
