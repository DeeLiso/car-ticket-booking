import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { APP_NAME, SUPPORT_PHONE } from "@/config";
import { Logo } from "@/components/common/Logo";
import { CookieSettingsButton } from "@/components/cookies/CookieSettingsButton";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 bg-navy-950 text-navy-100">
      <div className="container-app grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo imgClassName="h-9" variant="light" />
          <p className="mt-3 text-sm leading-relaxed text-navy-300">
            {t("landing.about.description")}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">{t("layout.company")}</p>
          <ul className="mt-3 space-y-2 text-sm text-navy-300">
            <li>
              <Link to="/about" className="hover:text-white">{t("layout.aboutUs")}</Link>
            </li>
            <li>
              <Link to="/cookies" className="hover:text-white">{t("layout.cookiePolicy")}</Link>
            </li>
            <li>
              <CookieSettingsButton />
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">{t("layout.support")}</p>
          <ul className="mt-3 space-y-2 text-sm text-navy-300">
            <li><a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="hover:text-white">{SUPPORT_PHONE}</a></li>
            <li><a href="mailto:tmaxoffic@gmail.com" className="hover:text-white">tmaxoffic@gmail.com</a></li>
            <li>{t("layout.faq")}</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">{t("layout.forPartners")}</p>
          <ul className="mt-3 space-y-2 text-sm text-navy-300">
            <li>
              <Link to="/login" className="hover:text-white">{t("layout.operatorLogin")}</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-navy-400">
        © {new Date().getFullYear()} {APP_NAME}. {t("layout.allRightsReserved")}.
      </div>
    </footer>
  );
}
