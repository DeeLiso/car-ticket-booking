import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchForm } from "@/components/forms/SearchForm";
import { HeroIllustration } from "@/components/graphics/HeroIllustration";
import { catalogApi, tripsApi } from "@/services/endpoints";
import { fmtMoney, initials } from "@/utils/format";

const FEATURES_KEYS = [
  {
    icon: "🧭",
    titleKey: "landing.features.liveAvailability.title",
    textKey: "landing.features.liveAvailability.text",
  },
  {
    icon: "🎫",
    titleKey: "landing.features.digitalQr.title",
    textKey: "landing.features.digitalQr.text",
  },
  {
    icon: "🔒",
    titleKey: "landing.features.secureCheckout.title",
    textKey: "landing.features.secureCheckout.text",
  },
  {
    icon: "↩️",
    titleKey: "landing.features.fairCancellation.title",
    textKey: "landing.features.fairCancellation.text",
  },
];

const STEPS_KEYS = [
  { nKey: "landing.howItWorks.step1.n", tKey: "landing.howItWorks.step1.t", dKey: "landing.howItWorks.step1.d" },
  { nKey: "landing.howItWorks.step2.n", tKey: "landing.howItWorks.step2.t", dKey: "landing.howItWorks.step2.d" },
  { nKey: "landing.howItWorks.step3.n", tKey: "landing.howItWorks.step3.t", dKey: "landing.howItWorks.step3.d" },
  { nKey: "landing.howItWorks.step4.n", tKey: "landing.howItWorks.step4.t", dKey: "landing.howItWorks.step4.d" },
];

const ADVANTAGES_KEYS = [
  { icon: "🛣️", labelKey: "landing.advantages.trustedRoutes.label", textKey: "landing.advantages.trustedRoutes.text" },
  { icon: "🛰️", labelKey: "landing.advantages.realTimeSeats.label", textKey: "landing.advantages.realTimeSeats.text" },
  { icon: "🛡️", labelKey: "landing.advantages.verifiedOperators.label", textKey: "landing.advantages.verifiedOperators.text" },
  { icon: "💳", labelKey: "landing.advantages.securePayments.label", textKey: "landing.advantages.securePayments.text" },
];

export function LandingPage() {
  const { t } = useTranslation();
  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: catalogApi.cities });
  const popular = cities.filter((c) => c.is_popular).slice(0, 6);

  const { data: priceByCity = {} } = useQuery({
    queryKey: ["landing-prices", popular.map((c) => c.id).join(",")],
    enabled: popular.length > 0,
    queryFn: async () => {
      const rows = await Promise.all(
        popular.map(async (c) => {
          const page = await tripsApi.search({ destination_city_id: c.id, page_size: 1, sort: "price" });
          const first = page.items[0];
          return [c.id, first ? { min: first.base_price, count: page.total } : null] as const;
        }),
      );
      const out: Record<string, { min: number; count: number }> = {};
      for (const [id, v] of rows) if (v) out[id] = v;
      return out;
    },
  });

  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />

      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden bg-hero-fade pb-32 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid" />
        <div className="pointer-events-none absolute -right-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -left-32 top-24 h-[26rem] w-[26rem] rounded-full bg-brand-500/25 blur-[120px]" />

        <div className="container-app relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
              <span className="badge border border-white/15 bg-white/10 text-orange-200">
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-orange-400" /> {t("landing.hero.badge")} 🇲🇲
              </span>
              <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                {t("landing.hero.title1")}
                <br />
                <span className="text-gradient">{t("landing.hero.title2")}</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-navy-200">
                {t("landing.hero.description")}
              </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/search"
                className="btn-primary px-6 py-3 text-base shadow-cta-lg"
              >
                {t("landing.hero.findTrip")} →
              </Link>
              <a
                href="#how"
                className="btn inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                {t("landing.hero.howItWorks")}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {["landing.hero.atomicHolds", "landing.hero.serverVerified", "landing.hero.instantQr"].map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-semibold text-navy-100"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> {t(k)}
                </span>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <HeroIllustration className="w-full drop-shadow-[0_30px_60px_rgba(3,8,24,0.55)]" />
          </div>
        </div>
      </section>

      {/* Floating search filter bar */}
      <div className="container-app relative z-20 -mt-20">
        <SearchForm initial={{ passengers: 1 }} />
      </div>

      {/* Service advantages */}
      <section className="container-app pt-16">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ADVANTAGES_KEYS.map((a) => (
            <div key={a.labelKey} className="surface-muted flex items-start gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-xl">
                {a.icon}
              </span>
              <span>
                <span className="block text-sm font-bold text-navy-900">{t(a.labelKey)}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-navy-500">{t(a.textKey)}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular destinations with prices */}
      <section className="container-app py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-navy-900">{t("landing.popularDestinations.title")}</h2>
            <p className="mt-1 text-navy-500">{t("landing.popularDestinations.subtitle")}</p>
          </div>
          <Link to="/search" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
            {t("landing.popularDestinations.browseAll")} →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {popular.map((c) => {
            const price = priceByCity[c.id];
            return (
              <Link
                key={c.id}
                to={`/search?destination_city_id=${c.id}`}
                className="card group flex flex-col items-start gap-3 p-4 transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-pop"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                  {initials(c.name)}
                </span>
                <span className="w-full">
                  <span className="block text-sm font-bold text-navy-900">{c.name}</span>
                  <span className="text-xs text-navy-400">{c.region ?? t("landing.popularDestinations.regionFallback")}</span>
                </span>
                <span className="mt-auto w-full border-t border-navy-100 pt-2.5">
                  {price ? (
                    <>
                      <span className="block text-[10px] uppercase tracking-wide text-navy-400">{t("landing.popularDestinations.from")}</span>
                      <span className="block font-display text-sm font-extrabold text-orange-600">
                        {fmtMoney(price.min)}
                      </span>
                    </>
                  ) : (
                    <span className="block pt-1 text-xs font-semibold text-navy-400 group-hover:text-orange-600">
                      {t("landing.popularDestinations.viewTrips")} →
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative overflow-hidden bg-hero-fade py-16 text-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid" />
        <div className="pointer-events-none absolute -right-32 -top-28 h-80 w-80 rounded-full bg-orange-500/20 blur-[110px]" />
        <div className="pointer-events-none absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-brand-500/25 blur-[110px]" />

        <div className="container-app relative">
          <h2 className="text-center font-display text-3xl font-extrabold text-white">
            {t("landing.howItWorks.title")}
          </h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS_KEYS.map((s) => (
              <div
                key={s.nKey}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
              >
                <span className="font-display text-3xl font-extrabold text-orange-400/40">{t(s.nKey)}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-white">{t(s.tKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">{t(s.dKey)}</p>
                <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-orange-500/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-app py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES_KEYS.map((f) => (
            <div key={f.titleKey} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-2xl">
                {f.icon}
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-navy-900">{t(f.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{t(f.textKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-app pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-navy-fade px-8 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-orange-500/25 blur-3xl" />
          <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">
            {t("landing.cta.title")}
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-navy-200">
            {t("landing.cta.subtitle")}
          </p>
          <Link to="/search" className="btn-primary relative mt-7 px-6 py-3 text-base shadow-cta-lg">
            {t("landing.cta.findTrip")} →
          </Link>
        </div>
      </section>

      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
