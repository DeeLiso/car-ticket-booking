import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage, StatGridSkeleton } from "@/components/common/Skeleton";
import { operatorApi } from "@/services/endpoints";
import { StatCard } from "@/components/dashboard/Stat";
import { fmtClock, fmtMoney } from "@/utils/format";

export function OperatorDashboardPage() {
  const { t } = useTranslation();
  const stats = useQuery({ queryKey: ["op-stats"], queryFn: operatorApi.stats });
  const trips = useQuery({ queryKey: ["op-trips"], queryFn: operatorApi.trips });

  const statusText = (code: string) => t(`operator.status.${code}`, { defaultValue: code });
  const cityText = (name?: string | null) => (name ? t(`operator.cities.${name}`, { defaultValue: name }) : "—");

  if (stats.isLoading || trips.isLoading)
    return (
      <SkeletonPage label={t("operator.dashboard.loading")}>
        <StatGridSkeleton count={4} />
        <h2 className="mb-4 mt-8 font-display text-lg font-bold text-navy-900">{t("operator.dashboard.upcomingTrips")}</h2>
        <ListSkeleton rows={3} />
      </SkeletonPage>
    );
  if (stats.error || trips.error)
    return (
      <div className="px-8 py-10">
        <InlineError
          message={((stats.error ?? trips.error) as Error).message}
          onRetry={() => {
            stats.refetch();
            trips.refetch();
          }}
        />
      </div>
    );

  const s = stats.data!;
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("operator.dashboard.title")} subtitle={t("operator.dashboard.subtitle")} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("operator.dashboard.buses")} value={s.total_buses} />
        <StatCard label={t("operator.dashboard.trips")} value={s.total_trips} />
        <StatCard label={t("operator.dashboard.confirmedBookings")} value={s.confirmed_bookings} />
        <StatCard label={t("operator.dashboard.seatsSold")} value={s.seats_sold} accent />
      </div>

      <h2 className="mb-4 mt-8 font-display text-lg font-bold text-navy-900">{t("operator.dashboard.upcomingTrips")}</h2>
      <div className="space-y-3">
        {trips.data!.length === 0 && (
          <Card className="p-6 text-center text-sm text-navy-400">{t("operator.dashboard.empty")}</Card>
        )}
        {trips.data!.slice(0, 8).map((trip) => (
          <Link key={trip.id} to={`/operator/trips/${trip.id}/manifest`}>
            <Card className="group flex flex-wrap items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-brand-50 px-3 py-2 text-center">
                  <p className="font-display text-lg font-extrabold leading-tight text-brand-700">{fmtClock(trip.departure_at)}</p>
                </div>
                <div>
                  <p className="font-semibold text-navy-900">{cityText(trip.origin)} → {cityText(trip.destination)}</p>
                  <p className="text-xs text-navy-500">{trip.bus ?? "—"} · {fmtMoney(trip.base_price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge label={statusText(trip.status)} />
                <span className="text-sm text-navy-500">{t("operator.dashboard.sold", { sold: trip.seats_sold, total: trip.total_seats })}</span>
                <span className="text-brand-500 transition group-hover:translate-x-0.5">→</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
