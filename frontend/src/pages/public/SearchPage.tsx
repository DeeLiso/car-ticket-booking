import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/layout/PageHero";
import { SearchForm, normalizeSearchParams } from "@/components/forms/SearchForm";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton } from "@/components/common/Skeleton";
import { Select, Field } from "@/components/common/Field";
import { tripsApi } from "@/services/endpoints";
import { durationText, fmtClock, fmtMoney, fmtDate } from "@/utils/format";
import type { TripSummary } from "@/types";

type SortKey = "price" | "departure" | "duration";

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => normalizeSearchParams(Object.fromEntries(searchParams.entries())), [searchParams]);
  const [query, setQuery] = useState(initial);
  const [sort, setSort] = useState<SortKey>("departure");
  const [window, setWindow] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["trips", query, sort, window],
    queryFn: () =>
      tripsApi.search({
        origin_city_id: query.origin_city_id || undefined,
        destination_city_id: query.destination_city_id || undefined,
        departure_date: query.departure_date,
        passengers: query.passengers,
        sort,
        departure_window: window || undefined,
      }),
  });

  const trips = data?.items ?? [];

  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />
      <PageHero className="-mt-16 pb-20 pt-24">
        <div className="container-app">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("search.heroTitle")}</h1>
          <p className="mt-2 max-w-xl text-sm text-navy-200">
            {t("search.heroSubtitle")}
          </p>
        </div>
      </PageHero>

      <div className="container-app relative z-20 -mt-16">
        <SearchForm initial={initial} onSubmit={(p) => setQuery(p)} />
      </div>

      <section className="container-app pb-8 pt-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="font-display text-lg font-extrabold text-navy-900 sm:text-xl">
            {initial.origin_city_id && initial.destination_city_id ? (
              <>
                {trips[0]?.origin_city?.name ?? "…"} → {trips[0]?.destination_city?.name ?? "…"}
              </>
            ) : (
              t("search.availableTrips")
            )}
            <span className="ml-2 text-xs font-medium text-navy-400 sm:text-sm">
              {data ? t("search.found", { count: data.total }) : ""}
            </span>
          </h1>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
            <div className="w-full sm:w-auto">
              <Field label="">
                <Select value={window} onChange={(e) => setWindow(e.target.value)} className="w-full py-2 sm:w-40">
                  <option value="">{t("search.window.any")}</option>
                  <option value="morning">{t("search.window.morning")}</option>
                  <option value="afternoon">{t("search.window.afternoon")}</option>
                  <option value="evening">{t("search.window.evening")}</option>
                  <option value="night">{t("search.window.night")}</option>
                </Select>
              </Field>
            </div>
            <div className="w-full sm:w-auto">
              <Field label="">
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="w-full py-2 sm:w-40"
                >
                  <option value="departure">{t("search.sort.departure")}</option>
                  <option value="price">{t("search.sort.price")}</option>
                  <option value="duration">{t("search.sort.duration")}</option>
                </Select>
              </Field>
            </div>
          </div>
        </div>

        {error && <InlineError message={(error as Error).message} onRetry={refetch} />}
        {isLoading && (
          <div role="status" aria-live="polite">
            <span className="sr-only">{t("search.searching")}</span>
            <ListSkeleton rows={4} />
          </div>
        )}
        {!isLoading && trips.length === 0 && (
          <EmptyState
            icon="🚌"
            title={t("search.emptyTitle")}
            description={t("search.emptyDesc")}
          />
        )}

        <div className="space-y-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      </section>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}

function TripCard({ trip }: { trip: TripSummary }) {
  const { t } = useTranslation();
  const priceText = fmtMoney(trip.base_price);
  return (
    <Link to={`/trips/${trip.id}`}>
      <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[0_10px_40px_-20px_rgba(5,10,24,0.9)] transition hover:-translate-y-0.5 hover:border-orange-400/50 hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.35)] dark:border-white/10 dark:bg-white/[0.06]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-brand-500/14 blur-[110px]" />
        <div className="relative grid gap-3 p-4 sm:gap-4 sm:p-5 sm:grid-cols-[110px_1fr_auto] sm:items-center">
          <div className="hidden flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex">
            <span className="font-display text-2xl font-extrabold text-orange-300">{fmtClock(trip.departure_at)}</span>
            <span className="text-[10px] uppercase tracking-wide text-navy-300">{fmtDate(trip.departure_at)}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="font-display text-base font-bold text-white sm:text-lg">{trip.operator?.company_name ?? t("search.operator")}</span>
              {trip.operator?.is_verified && <Badge label={t("search.verified")} />}
              <Badge label={trip.bus ? t(`trip.busType.${trip.bus.bus_type.toLowerCase()}`, { defaultValue: trip.bus.bus_type }) : ""} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-200 sm:gap-x-5 sm:text-sm">
              <span className="sm:hidden font-semibold text-orange-300">
                {fmtClock(trip.departure_at)} · {fmtDate(trip.departure_at)}
              </span>
              <span>{trip.origin_city?.name} → {trip.destination_city?.name}</span>
              <span className="inline-flex items-center gap-1">⏱ {durationText(trip.duration_minutes)}</span>
              <span className="inline-flex items-center gap-1">🪑 {t("search.seatsLeft", { count: trip.available_seats })}</span>
              <span className="inline-flex items-center gap-1">🚌 {trip.bus?.name ?? "—"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
            <span className={`font-display text-lg font-extrabold sm:text-xl ${trip.available_seats <= 3 ? "text-red-300" : "text-orange-300"}`}>
              {priceText}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-200 group-hover:text-white sm:text-sm">
              {t("search.chooseSeats")} <span className="transition group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}