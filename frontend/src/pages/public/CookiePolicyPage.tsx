import { ChartColumn, Cookie as CookieIcon, Megaphone, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { CookieSettingsButton } from "@/components/cookies/CookieSettingsButton";
import { useCookieConsent } from "@/store/cookieConsent";
import type { CookieCategoryOut } from "@/types";

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
    description:
      "Required for the site to work — keeping you signed in, holding your seat during checkout, and securing your session. These cannot be switched off.",
    required: true,
    enabled_by_default: true,
  },
  {
    key: "functional",
    name: "Functional Cookies",
    description:
      "Remember your preferences and choices, such as your selected city and booking details, to make the site easier to use.",
    required: false,
    enabled_by_default: false,
  },
  {
    key: "analytics",
    name: "Analytics Cookies",
    description:
      "Help us understand how the site is used so we can improve routes, search and the booking experience.",
    required: false,
    enabled_by_default: false,
  },
  {
    key: "marketing",
    name: "Marketing Cookies",
    description:
      "Used to show you relevant offers and travel deals. We never load these until you allow them.",
    required: false,
    enabled_by_default: false,
  },
];

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function CookiePolicyPage() {
  const { policy } = useCookieConsent();
  const categories = policy?.categories?.length ? policy.categories : FALLBACK_CATEGORIES;

  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />

      <section className="relative -mt-16 overflow-hidden bg-hero-fade pb-20 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid" />
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-500/25 blur-[120px]" />
        <div className="container-app relative z-10">
          <span className="badge border border-white/15 bg-white/10 text-orange-200">Legal &amp; privacy</span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Cookie Policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-navy-200">
            This policy explains how we use cookies and similar technologies, and the choices you
            have. You are in control of the optional categories.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <CookieIcon className="h-3.5 w-3.5 text-brand-200" aria-hidden="true" />
              Policy Version {policy?.version ?? "—"}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              Effective {formatDate(policy?.effective_date)}
            </span>
            <CookieSettingsButton className="inline-flex min-h-9 items-center rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" />
          </div>
        </div>
      </section>

      <section className="container-app py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-extrabold text-navy-900">What are cookies?</h2>
          <p className="mt-4 leading-relaxed text-navy-500">
            Cookies are small text files stored on your device when you visit a website. They help the
            site remember your actions and preferences over time, so you don&apos;t have to re-enter them
            every time you return. We group the cookies we use into four categories.
          </p>

          <div className="mt-8 space-y-4">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.key] ?? CookieIcon;
              return (
                <div key={category.key} className="card flex gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold text-navy-900">{category.name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          category.required
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-navy-100 text-navy-500"
                        }`}
                      >
                        {category.required ? "Always on" : "Optional"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-navy-500">{category.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mt-12 font-display text-2xl font-extrabold text-navy-900">Managing your choices</h2>
          <p className="mt-4 leading-relaxed text-navy-500">
            When you first visit, a notice lets you accept all cookies, reject the optional ones, or
            set your own preferences. You can change your mind at any time using the button below or
            the &ldquo;Cookie Settings&rdquo; link in the footer. We only load analytics and marketing
            tools after you have given consent, and your choice is recorded so we can honour it.
          </p>

          <div className="mt-6">
            <CookieSettingsButton className="btn-primary inline-flex min-h-11 items-center px-6 py-3 text-sm font-semibold" />
          </div>

          <h2 className="mt-12 font-display text-2xl font-extrabold text-navy-900">Changes to this policy</h2>
          <p className="mt-4 leading-relaxed text-navy-500">
            We may update this policy from time to time. When we make material changes we publish a new
            version and show the update notification again so you can review and re-confirm your
            choices. The current version is {policy?.version ?? "—"}, effective{" "}
            {formatDate(policy?.effective_date)}, and was last updated {formatDate(policy?.updated_date)}.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
