import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { Skeleton } from "@/components/common/Skeleton";
import { SeatMap } from "@/components/seats/SeatMap";
import { tripsApi } from "@/services/endpoints";
import { Button } from "@/components/common/Button";
import { durationText, fmtClock, fmtDate, fmtMoney } from "@/utils/format";

export function TripDetailPage() {
  const { t } = useTranslation();
  const { tripId } = useParams<{ tripId: string }>();
  const tripQ = useQuery({ queryKey: ["trip", tripId], queryFn: () => tripsApi.detail(tripId!), enabled: !!tripId });
  const seatsQ = useQuery({ queryKey: ["trip-seats", tripId], queryFn: () => tripsApi.seats(tripId!), enabled: !!tripId });

  if (tripQ.isLoading || seatsQ.isLoading)
    return (
      <div id="main" tabIndex={-1} className="min-h-screen outline-none">
        <PublicHeader />
        <section className="container-app py-8">
          <div role="status" aria-live="polite">
            <span className="sr-only">{t("trip.loading")}</span>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="card p-5">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-2 h-4 w-64" />
                <div className="mt-6 grid grid-cols-4 gap-3">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="card space-y-3 p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  if (tripQ.error || seatsQ.error)
    return (
      <div className="container-app py-10">
        <InlineError
          message={(tripQ.error ?? seatsQ.error as Error).message}
          onRetry={() => {
            tripQ.refetch();
            seatsQ.refetch();
          }}
        />
      </div>
    );
  const trip = tripQ.data!;
  const map = seatsQ.data!;

  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />
      <PageHero className="-mt-16 pb-10 pt-24">
        <div className="container-app">
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-navy-300">
            <Link to="/search" className="-my-2 inline-flex min-h-9 items-center py-2 hover:text-white">{t("trip.findTrips")}</Link>
            <span aria-hidden="true">/</span>
            {trip.origin_city?.name} → {trip.destination_city?.name}
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h1 className="font-display text-xl font-extrabold sm:text-2xl lg:text-3xl">
                {trip.origin_city?.name} → {trip.destination_city?.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-navy-200 sm:gap-x-5 sm:text-sm">
                <span className="font-semibold text-orange-300">
                  {fmtClock(trip.departure_at)} — {fmtClock(trip.arrival_at)} · {fmtDate(trip.departure_at)}
                </span>
                <span>⏱ {durationText(trip.duration_minutes)}</span>
                <span>🚌 {trip.bus?.name} · {t(`trip.busType.${trip.bus?.bus_type?.toLowerCase()}`, { defaultValue: trip.bus?.bus_type ?? "" })}</span>
                <Badge label={t(`trip.status.${trip.status.toLowerCase()}`, { defaultValue: trip.status })} />
                {trip.operator?.is_verified && <Badge label={t("trip.verified")} />}
              </div>
            </div>
            <Card className="px-4 py-3 text-right sm:px-5 sm:py-4">
              <p className="text-xs text-navy-400">{t("trip.from")}</p>
              <p className="font-display text-xl font-extrabold text-brand-800 sm:text-2xl">{fmtMoney(map.base_price)}</p>
              <p className="mt-0.5 text-xs text-navy-400">{t("trip.seatsLeft", { count: map.available_seats })}</p>
            </Card>
          </div>
        </div>
      </PageHero>

      <section className="container-app py-6 sm:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-4 sm:p-5">
            <PageHeader variant="plain" title={t("trip.chooseSeatTitle")} subtitle={t("trip.chooseSeatSubtitle")} />
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <SeatMap map={map} selected={new Set()} maxSelect={1} onToggle={() => undefined} readOnly />
            </div>
          </Card>
          <div className="space-y-3 sm:space-y-4">
            <Card className="p-4 sm:p-5">
              <h3 className="font-display font-bold text-navy-900">{t("trip.operatorLabel")}</h3>
              <p className="mt-1 text-sm text-navy-600">{trip.operator?.company_name}</p>
              <h3 className="mt-4 font-display font-bold text-navy-900">{t("trip.amenities")}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(trip.bus?.amenities ?? []).map((a) => (
                  <span key={a} className="badge bg-brand-50 text-brand-700">{a}</span>
                ))}
                {!trip.bus?.amenities?.length && <span className="text-sm text-navy-400">{t("trip.standardAmenities")}</span>}
              </div>
              <div className="mt-5">
                <Link to={`/trips/${trip.id}/checkout`} className="block">
                  <Button size="lg" className="w-full">{t("trip.bookCta")} →</Button>
                </Link>
                <p className="mt-2 text-center text-xs text-navy-400">
                  {t("trip.bookNote")}
                </p>
              </div>
            </Card>
            <Card className="p-4 text-sm text-navy-600 sm:p-5">
              <p className="font-semibold text-navy-900">{t("trip.goodToKnowTitle")}</p>
              <ul className="mt-2 list-inside space-y-1 list-disc">
                <li>{t("trip.goodHold")}</li>
                <li>{t("trip.goodFees")}</li>
                <li>{t("trip.goodTicket")}</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}