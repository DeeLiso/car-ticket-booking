import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Building2,
  Cookie,
  LifeBuoy,
  Mail,
  Phone,
  Scale,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Card, PageHeader } from "@/components/common/Card";
import { CookieSettingsButton } from "@/components/cookies/CookieSettingsButton";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { navFor } from "@/components/layout/navConfig";
import { useAuthStore } from "@/store/auth";
import { APP_NAME, SUPPORT_PHONE } from "@/config";

function SectionHeading({ id, title, subtitle }: { id?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="font-display text-lg font-bold text-navy-900">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm leading-6 text-navy-500">{subtitle}</p>}
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card transition-colors dark:border-white/10 dark:bg-navy-900/70">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-brand-700 dark:bg-white/5 dark:text-brand-300">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <h3 className="font-display text-sm font-bold text-navy-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

const infoLinkClass =
  "inline-flex min-h-9 items-center gap-2 rounded-md text-sm text-navy-600 transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:text-navy-300 dark:hover:text-brand-300 dark:focus-visible:ring-offset-navy-900";

export function SettingsPage() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role ?? "PASSENGER");

  return (
    <div className="px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 lg:px-10 lg:pb-10 lg:pt-24">
      <div className="lg:hidden">
        <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      </div>
      <div className="mx-auto hidden max-w-7xl lg:block">
        <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} variant="plain" />
      </div>

      <div className="mx-auto max-w-7xl space-y-8">
        <section aria-labelledby="settings-appearance-title">
          <div className="mb-4">
            <h2 id="settings-appearance-title" className="font-display text-lg font-bold text-navy-900">
              {t("settings.appearance.title")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-navy-500">{t("settings.appearance.subtitle")}</p>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="grid divide-y divide-navy-100 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{t("settings.appearance.darkMode")}</p>
                </div>
                <span className="rounded-xl focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-navy-950">
                  <ThemeToggle light />
                </span>
              </div>
              <div className="flex min-h-[92px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{t("settings.appearance.language")}</p>
                </div>
                <span className="rounded-xl focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-navy-950">
                  <LanguageSwitcher light />
                </span>
              </div>
            </div>
          </Card>
        </section>

        <section aria-labelledby="settings-menu-title">
          <SectionHeading id="settings-menu-title" title={t("settings.menu.title")} subtitle={t("settings.menu.subtitle")} />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {navFor(role).map((group) => (
              <section
                key={group.title}
                aria-label={t(group.title)}
                className="rounded-2xl border border-navy-100 bg-navy-50/50 p-4 dark:border-white/10 dark:bg-white/[0.025]"
              >
                <div className="mb-3 flex items-center gap-2.5 px-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-navy-500">{t(group.title)}</h3>
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.to.split("/").length === 2}
                          className={({ isActive }) =>
                            `group flex min-h-[58px] items-center gap-3 rounded-xl border px-3.5 py-2.5 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-navy-950 ${
                              isActive
                                ? "border-brand-200 bg-brand-50 text-brand-800 shadow-sm dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-200"
                                : "border-navy-100 bg-white text-navy-700 hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 hover:shadow-sm dark:border-white/10 dark:bg-navy-900/70 dark:text-navy-200 dark:hover:border-brand-400/30 dark:hover:text-brand-200"
                            }`
                          }
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-700 dark:bg-white/5 dark:text-navy-300 dark:group-hover:bg-brand-500/10 dark:group-hover:text-brand-200">
                            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-semibold">{t(item.label)}</span>
                          <ArrowUpRight
                            className="h-4 w-4 shrink-0 text-navy-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-600 dark:text-navy-500"
                            aria-hidden="true"
                          />
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="settings-links-title">
          <SectionHeading id="settings-links-title" title={t("settings.links.title")} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <InfoCard title={t("settings.links.company")} icon={Building2}>
              <ul className="space-y-1">
                <li>
                  <Link to="/about" className={infoLinkClass}>
                    {t("settings.links.about")}
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className={infoLinkClass}>
                    <Cookie className="h-4 w-4 text-navy-400" aria-hidden="true" />
                    {t("settings.links.cookiePolicy")}
                  </Link>
                </li>
                <li>
                  <CookieSettingsButton className={`${infoLinkClass} text-left`} />
                </li>
              </ul>
            </InfoCard>

            <InfoCard title={t("settings.links.support")} icon={LifeBuoy}>
              <ul className="space-y-1">
                <li>
                  <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className={infoLinkClass}>
                    <Phone className="h-4 w-4 text-navy-400" aria-hidden="true" />
                    {SUPPORT_PHONE}
                  </a>
                </li>
                <li>
                  <a href="mailto:tmaxoffic@gmail.com" className={infoLinkClass}>
                    <Mail className="h-4 w-4 text-navy-400" aria-hidden="true" />
                    <span className="break-all">tmaxoffic@gmail.com</span>
                  </a>
                </li>
                <li>
                  <span className={`${infoLinkClass} cursor-default`}>{t("settings.links.faq")}</span>
                </li>
              </ul>
            </InfoCard>

            <InfoCard title={t("settings.links.partners")} icon={UsersRound}>
              <ul>
                <li>
                  <Link to="/login" className={infoLinkClass}>
                    {t("settings.links.operatorLogin")}
                    <ArrowUpRight className="h-3.5 w-3.5 text-navy-400" aria-hidden="true" />
                  </Link>
                </li>
              </ul>
            </InfoCard>

            {role === "ADMIN" && (
              <InfoCard title={t("settings.links.admin")} icon={ShieldCheck}>
                <ul>
                  <li>
                    <Link to="/admin/audit" className={infoLinkClass}>
                      <ScrollText className="h-4 w-4 text-navy-400" aria-hidden="true" />
                      {t("settings.links.auditLogs")}
                    </Link>
                  </li>
                </ul>
              </InfoCard>
            )}

            <InfoCard title={t("settings.links.legal")} icon={Scale}>
              <p className="text-sm leading-6 text-navy-500">
                {t("settings.links.rights", { year: new Date().getFullYear(), app: APP_NAME })}
              </p>
            </InfoCard>
          </div>
        </section>

        <p className="border-t border-navy-100 pt-4 text-center text-xs text-navy-400 dark:border-white/10">
          Version 2.5.0
        </p>
      </div>
    </div>
  );
}
