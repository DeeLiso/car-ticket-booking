import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { operatorApi } from "@/services/endpoints";
import type { ManifestPassenger } from "@/types";
import { fmtDateTime } from "@/utils/format";

export function OperatorManifestPage() {
  const { t } = useTranslation();
  const { tripId } = useParams<{ tripId: string }>();
  const q = useQuery({ queryKey: ["op-manifest", tripId], queryFn: () => operatorApi.manifest(tripId!), enabled: !!tripId });

  const cityText = (name?: string | null) => (name ? t(`operator.cities.${name}`, { defaultValue: name }) : "—");

  if (q.isLoading)
    return (
      <SkeletonPage label={t("operator.manifest.loading")}>
        <TableSkeleton columns={4} rows={8} />
      </SkeletonPage>
    );
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
        title={t("operator.manifest.title")}
        subtitle={t("operator.manifest.subtitle", {
          origin: cityText(m.origin),
          destination: cityText(m.destination),
          departs: fmtDateTime(m.departure_at),
        })}
        actions={<Badge label={t("operator.manifest.confirmedCount", { count: m.confirmed_seats })} />}
      />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">{t("operator.manifest.seat")}</th>
                <th className="px-5 py-3">{t("operator.manifest.passenger")}</th>
                <th className="px-5 py-3">{t("operator.manifest.phone")}</th>
                <th className="px-5 py-3">{t("operator.manifest.bookingRef")}</th>
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
                    {t("operator.manifest.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-sm text-navy-400">{t("operator.manifest.footer", { registration: m.bus_registration, tripId: m.trip_id })}</p>
    </div>
  );
}
