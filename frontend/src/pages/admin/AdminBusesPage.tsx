import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Badge } from "@/components/common/Badge";
import { adminApi } from "@/services/endpoints";

export function AdminBusesPage() {
  const { t } = useTranslation();
  const buses = useQuery({ queryKey: ["admin-buses"], queryFn: () => adminApi.buses(1, 20) });

  const busType = (code: string) => t(`admin.buses.busTypes.${code}`, { defaultValue: code });

  if (buses.isLoading)
    return (
      <SkeletonPage label={t("admin.buses.loading")}>
        <TableSkeleton columns={6} rows={6} />
      </SkeletonPage>
    );
  if (buses.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(buses.error as Error).message} onRetry={() => buses.refetch()} />
      </div>
    );

  const items = buses.data?.items ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("admin.buses.title")} subtitle={t("admin.buses.subtitle")} />
      <div className="space-y-3 sm:hidden">
        {items.map((b) => (
          <Card key={b.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-base font-bold text-navy-900">{b.name}</p>
              <Badge label={b.is_active ? t("admin.status.ACTIVE") : t("admin.status.BLOCKED")} />
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.buses.reg")}</dt>
                <dd className="break-all text-right font-medium text-navy-800">{b.registration_number}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.buses.type")}</dt>
                <dd className="text-right font-medium text-navy-800">{busType(b.bus_type)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.buses.layout")}</dt>
                <dd className="text-right font-medium text-navy-800">{b.layout}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.buses.seats")}</dt>
                <dd className="font-medium text-navy-800">{b.seat_capacity}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="hidden p-0 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">{t("admin.buses.name")}</th>
                <th className="px-5 py-3">{t("admin.buses.reg")}</th>
                <th className="px-5 py-3">{t("admin.buses.type")}</th>
                <th className="px-5 py-3">{t("admin.buses.layout")}</th>
                <th className="px-5 py-3">{t("admin.buses.seats")}</th>
                <th className="px-5 py-3">{t("admin.buses.active")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{b.name}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.registration_number}</td>
                  <td className="px-5 py-2.5 text-navy-500">{busType(b.bus_type)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.layout}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.seat_capacity}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.is_active ? t("common.yes") : t("common.no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}