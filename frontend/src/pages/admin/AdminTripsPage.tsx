import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { adminApi } from "@/services/endpoints";
import { fmtDateTime } from "@/utils/format";

export function AdminTripsPage() {
  const q = useQuery({ queryKey: ["admin-trips"], queryFn: () => adminApi.trips({ page: 1, page_size: 20 }) });

  if (q.isLoading)
    return (
      <SkeletonPage label="Loading trips">
        <TableSkeleton columns={6} rows={8} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const items = q.data?.items ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="Trips" subtitle="All scheduled trips across the platform." />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Departure</th>
                <th className="px-5 py-3">Bus</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Seats</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-semibold text-navy-900">
                    {t.origin_city?.name ?? "—"} → {t.destination_city?.name ?? "—"}
                  </td>
                  <td className="px-5 py-2.5 text-navy-500">{fmtDateTime(t.departure_at)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{t.bus?.name}</td>
                  <td className="px-5 py-2.5 text-navy-500">{t.base_price}</td>
                  <td className="px-5 py-2.5 text-navy-500">{t.status}</td>
                  <td className="px-5 py-2.5 text-navy-500">{t.available_seats}/{t.total_seats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}