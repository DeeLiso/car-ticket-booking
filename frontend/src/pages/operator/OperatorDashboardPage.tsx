import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage, StatGridSkeleton } from "@/components/common/Skeleton";
import { operatorApi } from "@/services/endpoints";
import { StatCard } from "@/components/dashboard/Stat";
import { fmtClock, fmtMoney } from "@/utils/format";

export function OperatorDashboardPage() {
  const stats = useQuery({ queryKey: ["op-stats"], queryFn: operatorApi.stats });
  const trips = useQuery({ queryKey: ["op-trips"], queryFn: operatorApi.trips });

  if (stats.isLoading || trips.isLoading)
    return (
      <SkeletonPage label="Loading dashboard">
        <StatGridSkeleton count={4} />
        <h2 className="mb-4 mt-8 font-display text-lg font-bold text-navy-900">Upcoming trips</h2>
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
      <PageHeader title="Operator dashboard" subtitle="Your fleet at a glance." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Buses" value={s.total_buses} />
        <StatCard label="Trips" value={s.total_trips} />
        <StatCard label="Confirmed bookings" value={s.confirmed_bookings} />
        <StatCard label="Seats sold" value={s.seats_sold} accent />
      </div>

      <h2 className="mb-4 mt-8 font-display text-lg font-bold text-navy-900">Upcoming trips</h2>
      <div className="space-y-3">
        {trips.data!.length === 0 && (
          <Card className="p-6 text-center text-sm text-navy-400">No trips assigned to your fleet yet.</Card>
        )}
        {trips.data!.slice(0, 8).map((t) => (
          <Link key={t.id} to={`/operator/trips/${t.id}/manifest`}>
            <Card className="group flex flex-wrap items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-brand-50 px-3 py-2 text-center">
                  <p className="font-display text-lg font-extrabold leading-tight text-brand-700">{fmtClock(t.departure_at)}</p>
                </div>
                <div>
                  <p className="font-semibold text-navy-900">{t.origin ?? "—"} → {t.destination ?? "—"}</p>
                  <p className="text-xs text-navy-500">{t.bus ?? "—"} · {fmtMoney(t.base_price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge label={t.status} />
                <span className="text-sm text-navy-500">{t.seats_sold}/{t.total_seats} sold</span>
                <span className="text-brand-500 transition group-hover:translate-x-0.5">→</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}