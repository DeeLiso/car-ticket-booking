import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { SeatMap } from "@/components/seats/SeatMap";
import { tripsApi } from "@/services/endpoints";
import { Button } from "@/components/common/Button";
import { durationText, fmtClock, fmtDate, fmtMoney, titleCase } from "@/utils/format";

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const tripQ = useQuery({ queryKey: ["trip", tripId], queryFn: () => tripsApi.detail(tripId!), enabled: !!tripId });
  const seatsQ = useQuery({ queryKey: ["trip-seats", tripId], queryFn: () => tripsApi.seats(tripId!), enabled: !!tripId });

  if (tripQ.isLoading || seatsQ.isLoading) return <PageLoader label="Loading trip…" />;
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
    <div id="main" tabIndex={-1} className="min-h-screen outline-none">
      <PublicHeader />
      <section className="border-b border-navy-100 bg-white">
        <div className="container-app py-6">
          <nav className="mb-3 text-xs text-navy-400">
            <Link to="/search" className="hover:text-brand-700">Find trips</Link> /{" "}
            {trip.origin_city?.name} → {trip.destination_city?.name}
          </nav>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {trip.origin_city?.name} → {trip.destination_city?.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-navy-600">
                <span className="font-semibold text-brand-700">
                  {fmtClock(trip.departure_at)} — {fmtClock(trip.arrival_at)} · {fmtDate(trip.departure_at)}
                </span>
                <span>⏱ {durationText(trip.duration_minutes)}</span>
                <span>🚌 {trip.bus?.name} · {titleCase(trip.bus?.bus_type ?? "")}</span>
                <Badge label={trip.status} />
                {trip.operator?.is_verified && <Badge label="Verified" />}
              </div>
            </div>
            <Card className="px-5 py-4 text-right">
              <p className="text-xs text-navy-400">from</p>
              <p className="font-display text-2xl font-extrabold text-brand-800">{fmtMoney(map.base_price)}</p>
              <p className="mt-0.5 text-xs text-navy-400">{map.available_seats} seats left</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-app py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="p-5">
            <PageHeader title="Choose a seat" subtitle="Exactly what you see is exactly what you get." />
            <SeatMap map={map} selected={new Set()} maxSelect={1} onToggle={() => undefined} readOnly />
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-display font-bold text-navy-900">Operator</h3>
              <p className="mt-1 text-sm text-navy-600">{trip.operator?.company_name}</p>
              <h3 className="mt-4 font-display font-bold text-navy-900">Amenities</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(trip.bus?.amenities ?? []).map((a) => (
                  <span key={a} className="badge bg-brand-50 text-brand-700">{a}</span>
                ))}
                {!trip.bus?.amenities?.length && <span className="text-sm text-navy-400">Standard amenities</span>}
              </div>
              <div className="mt-5">
                <Link to={`/trips/${trip.id}/checkout`}>
                  <Button size="lg" className="w-full">Book this trip →</Button>
                </Link>
                <p className="mt-2 text-center text-xs text-navy-400">
                  You’ll pick exact seats at checkout. Holds expire automatically.
                </p>
              </div>
            </Card>
            <Card className="p-5 text-sm text-navy-600">
              <p className="font-semibold text-navy-900">Good to know</p>
              <ul className="mt-2 list-inside space-y-1 list-disc">
                <li>Seat holds last up to 10 minutes.</li>
                <li>Prices include all standard fees.</li>
                <li>Digital tickets are issued on payment.</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}