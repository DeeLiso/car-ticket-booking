import { useState } from "react";
import {
  ChartColumn,
  Cookie as CookieIcon,
  Loader2,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CookieCategoryOut, CookieCategoryPrefs, OptionalCookieCategory } from "@/types";
import { useCookieConsent } from "@/store/cookieConsent";

const CATEGORY_ICONS: Record<string, typeof CookieIcon> = {
  necessary: ShieldCheck,
  functional: SlidersHorizontal,
  analytics: ChartColumn,
  marketing: Megaphone,
};

const FALLBACK_CATEGORIES: CookieCategoryOut[] = [
  {
    key: "necessary",
    name: "Strictly Necessary Cookies",
    description: "Required for the site to work — sign-in, holding your seat, and secure checkout.",
    required: true,
    enabled_by_default: true,
  },
  {
    key: "functional",
    name: "Functional Cookies",
    description: "Remember your preferences and choices to make the site easier to use.",
    required: false,
    enabled_by_default: false,
  },
  {
    key: "analytics",
    name: "Analytics Cookies",
    description: "Help us understand how the site is used so we can improve it.",
    required: false,
    enabled_by_default: false,
  },
  {
    key: "marketing",
    name: "Marketing Cookies",
    description: "Used to show relevant offers and travel deals.",
    required: false,
    enabled_by_default: false,
  },
];

export function CookiePreferenceSettings() {
  const { t } = useTranslation();
  const { policy, preferences, saving, savePreferences, acceptAll, rejectOptional } = useCookieConsent();
  const [draft, setDraft] = useState<CookieCategoryPrefs>(preferences);

  const categories = policy?.categories?.length ? policy.categories : FALLBACK_CATEGORIES;

  const toggle = (key: OptionalCookieCategory) =>
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      <p className="text-sm leading-relaxed text-navy-200">
        {t("cookies.preferences.description")}
      </p>

      <ul className="mt-5 space-y-3">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.key] ?? CookieIcon;
          const key = category.key as OptionalCookieCategory;
          const enabled = category.required ? true : draft[key];
          return (
            <li
              key={category.key}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-display text-sm font-bold text-white">
                      {t(`cookies.preferences.${category.key}.name`) || category.name}
                    </h4>
                    {category.required ? (
                      <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
                        {t("cookies.preferences.alwaysOn")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={`${category.name} ${enabled ? "enabled" : "disabled"}`}
                        disabled={saving}
                        onClick={() => toggle(key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900 disabled:opacity-60 ${
                          enabled
                            ? "border-brand-400/60 bg-brand-500"
                            : "border-white/15 bg-white/10"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                            enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-navy-300">
                    {t(`cookies.preferences.${category.key}.description`) || category.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => savePreferences(draft)}
          disabled={saving}
          className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {t("cookies.preferences.save")}
        </button>
        <button
          type="button"
          onClick={acceptAll}
          disabled={saving}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
        >
          {t("cookies.preferences.acceptAll")}
        </button>
        <button
          type="button"
          onClick={rejectOptional}
          disabled={saving}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-navy-200 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
        >
          {t("cookies.preferences.rejectOptional")}
        </button>
      </div>
    </div>
  );
}
