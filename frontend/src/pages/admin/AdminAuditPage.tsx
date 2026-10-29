import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Badge } from "@/components/common/Badge";
import { adminApi } from "@/services/endpoints";
import { fmtDateTime } from "@/utils/format";

export function AdminAuditPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["admin-audit"], queryFn: adminApi.auditLogs });

  const actionLabel = (action: string) => {
    const key = action.replace(/\.([a-z])/g, (_m, c: string) => c.toUpperCase());
    return t(`admin.audit.actionLabels.${key}`, { defaultValue: action });
  };
  const entityLabel = (entity?: string | null) => {
    if (!entity) return "—";
    const key = entity.charAt(0).toLowerCase() + entity.slice(1);
    return t(`admin.audit.entityTypes.${key}`, { defaultValue: entity });
  };
  const roleLabel = (role?: string | null) => {
    if (!role) return t("admin.audit.roles.SYSTEM");
    return t(`admin.audit.roles.${role}`, { defaultValue: role });
  };

  if (q.isLoading)
    return (
      <SkeletonPage label={t("admin.audit.loading")}>
        <TableSkeleton columns={6} rows={8} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const items = q.data ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("admin.audit.title")} subtitle={t("admin.audit.subtitle")} />
      <div className="space-y-3 sm:hidden">
        {items.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-base font-bold text-navy-900">{actionLabel(a.action)}</p>
              <Badge label={a.actor_role ?? t("admin.status.ACTIVE")} />
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.audit.time")}</dt>
                <dd className="text-right font-medium text-navy-800">{fmtDateTime(a.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.audit.actor")}</dt>
                <dd className="break-all text-right font-medium text-navy-800">{a.actor_user_id ?? t("admin.audit.systemActor")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.audit.entity")}</dt>
                <dd className="break-all text-right font-medium text-navy-800">{entityLabel(a.entity_type)} {a.entity_id ? `#${a.entity_id.slice(0, 8)}` : ""}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.audit.ip")}</dt>
                <dd className="break-all text-right font-medium text-navy-800">{a.ip_address ?? "—"}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card className="hidden p-0 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">{t("admin.audit.time")}</th>
                <th className="px-5 py-3">{t("admin.audit.actor")}</th>
                <th className="px-5 py-3">{t("admin.audit.role")}</th>
                <th className="px-5 py-3">{t("admin.audit.action")}</th>
                <th className="px-5 py-3">{t("admin.audit.entity")}</th>
                <th className="px-5 py-3">{t("admin.audit.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 text-navy-500">{fmtDateTime(a.created_at)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{a.actor_user_id ?? t("admin.audit.systemActor")}</td>
                  <td className="px-5 py-2.5 text-navy-500">{roleLabel(a.actor_role)}</td>
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{actionLabel(a.action)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{entityLabel(a.entity_type)} {a.entity_id ? `#${a.entity_id.slice(0, 8)}` : ""}</td>
                  <td className="px-5 py-2.5 text-navy-500">{a.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}