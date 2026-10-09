import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchForm, normalizeSearchParams } from "@/components/forms/SearchForm";
import { Badge } from "@/components/common/Badge";
import { Card, EmptyState } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton } from "@/components/common/Skeleton";
import { Select, Field } from "@/components/common/Field";
import { tripsApi } from "@/services/endpoints";
import { durationText, fmtClock, fmtMoney, fmtDate } from "@/utils/format";
import type { TripSummary } from "@/types";

type SortKey = "price" | "departure" | "duration";

export function SearchPage() {
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
    <div id="main" tabIndex={-1} className="min-h-screen outline-none">
      <PublicHeader />
      <section className="border-b border-navy-100 bg-white">
        <div className="container-app py-6">
          <SearchForm initial={initial} variant="compact" onSubmit={(p) => setQuery(p)} />
        </div>
      </section>

      <section className="container-app py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-xl font-extrabold text-navy-900">
            {initial.origin_city_id && initial.destination_city_id ? (
              <>
                {trips[0]?.origin_city?.name ?? "…"} → {trips[0]?.destination_city?.name ?? "…"}
              </>
            ) : (
              "Available trips"
            )}
            <span className="ml-2 text-sm font-medium text-navy-400">
              {data ? `${data.total} found` : ""}
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <Field label="">
              <Select value={window} onChange={(e) => setWindow(e.target.value)} className="w-40 py-2">
                <option value="">Any time</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </Select>
            </Field>
            <Field label="">
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-40 py-2"
              >
                <option value="departure">Earliest</option>
                <option value="price">Cheapest</option>
                <option value="duration">Shortest</option>
              </Select>
            </Field>
          </div>
        </div>

        {error && <InlineError message={(error as Error).message} onRetry={refetch} />}
        {isLoading && (
          <div role="status" aria-live="polite">
            <span className="sr-only">Searching trips…</span>
            <ListSkeleton rows={4} />
          </div>
        )}
        {!isLoading && trips.length === 0 && (
          <EmptyState
            icon="🚌"
            title="No trips match"
            description="Try a different date, route, or passenger count. New trips open every day."
          />
        )}

        <div className="space-y-4">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function TripCard({ trip }: { trip: TripSummary }) {
  const priceText = fmtMoney(trip.base_price);
  return (
    <Link to={`/trips/${trip.id}`}>
      <Card className="group grid gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="hidden flex-col items-center gap-1 rounded-xl bg-brand-50 p-3 sm:flex">
          <span className="font-display text-2xl font-extrabold text-brand-700">{fmtClock(trip.departure_at)}</span>
          <span className="text-[10px] text-navy-400">{fmtDate(trip.departure_at)}</span>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold text-navy-900">{trip.operator?.company_name ?? "Operator"}</span>
            {trip.operator?.is_verified && <Badge label="Verified" />}
            <Badge label={trip.bus?.bus_type ?? ""} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-navy-600">
            <span className="sm:hidden font-semibold text-brand-700">
              {fmtClock(trip.departure_at)} · {fmtDate(trip.departure_at)}
            </span>
            <span>{trip.origin_city?.name} → {trip.destination_city?.name}</span>
            <span className="inline-flex items-center gap-1">⏱ {durationText(trip.duration_minutes)}</span>
            <span className="inline-flex items-center gap-1">🪑 {trip.available_seats} seats left</span>
            <span className="inline-flex items-center gap-1">🚌 {trip.bus?.name ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-navy-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <span className={`font-display text-xl font-extrabold ${trip.available_seats <= 3 ? "text-red-600" : "text-brand-800"}`}>
            {priceText}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:underline">
            Choose seats <span className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </Card>
    </Link>
  );
}