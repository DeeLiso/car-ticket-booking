import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/Badge";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { operatorApi } from "@/services/endpoints";
import { fmtClock, fmtDate, fmtMoney } from "@/utils/format";

export function OperatorTripsPage() {
  const q = useQuery({ queryKey: ["op-trips"], queryFn: operatorApi.trips });

  if (q.isLoading)
    return (
      <SkeletonPage label="Loading trips">
        <ListSkeleton rows={4} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const trips = q.data ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="Trips" subtitle="Open a trip to see its boarding manifest." />
      {trips.length === 0 && <EmptyState icon="🚌" title="No trips yet" description="Trips appear here once routed to your buses." />}
      <div className="space-y-3">
        {trips.map((t) => (
          <Link key={t.id} to={`/operator/trips/${t.id}/manifest`}>
            <Card className="group grid gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="hidden flex-col items-center rounded-xl bg-brand-50 px-4 py-2 sm:flex">
                <span className="font-display text-xl font-extrabold text-brand-700">{fmtClock(t.departure_at)}</span>
                <span className="text-[10px] text-navy-400">{fmtDate(t.departure_at)}</span>
              </div>
              <div>
                <p className="font-semibold text-navy-900">{fmtClock(t.departure_at)} · {t.origin ?? "—"} → {t.destination ?? "—"}</p>
                <p className="text-sm text-navy-500">{t.bus ?? "—"} · {fmtMoney(t.base_price)} · {t.seats_sold}/{t.total_seats} sold</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <Badge label={t.status} />
                <span className="text-sm font-semibold text-brand-700 group-hover:underline">Manifest →</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}