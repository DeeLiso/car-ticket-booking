import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { operatorApi } from "@/services/endpoints";
import type { ManifestPassenger } from "@/types";
import { fmtDateTime } from "@/utils/format";

export function OperatorManifestPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const q = useQuery({ queryKey: ["op-manifest", tripId], queryFn: () => operatorApi.manifest(tripId!), enabled: !!tripId });

  if (q.isLoading) return <PageLoader />;
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const m = q.data!;
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title="Trip manifest"
        subtitle={`${m.origin} → ${m.destination} · Departs ${fmtDateTime(m.departure_at)}`}
        actions={<Badge label={`Confirmed: ${m.confirmed_seats}`} />}
      />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Seat</th>
                <th className="px-5 py-3">Passenger</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Booking ref</th>
              </tr>
            </thead>
            <tbody>
              {m.passengers.map((p: ManifestPassenger) => (
                <tr key={p.booking_reference + p.seat_number} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-bold text-navy-900">{p.seat_number}</td>
                  <td className="px-5 py-2.5 text-navy-800">{p.passenger_name}</td>
                  <td className="px-5 py-2.5 text-navy-500">{p.phone}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-navy-500">{p.booking_reference}</td>
                </tr>
              ))}
              {m.passengers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-navy-400">
                    No confirmed passengers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-sm text-navy-400">Bus: {m.bus_registration} · Trip ID: {m.trip_id}</p>
    </div>
  );
}