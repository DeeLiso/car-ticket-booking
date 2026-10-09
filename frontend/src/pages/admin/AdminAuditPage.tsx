import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { adminApi } from "@/services/endpoints";
import { fmtDateTime } from "@/utils/format";

export function AdminAuditPage() {
  const q = useQuery({ queryKey: ["admin-audit"], queryFn: adminApi.auditLogs });

  if (q.isLoading)
    return (
      <SkeletonPage label="Loading audit logs">
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
      <PageHeader title="Audit logs" subtitle="Recent admin/operator actions for traceability." />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 text-navy-500">{fmtDateTime(a.created_at)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{a.actor_user_id ?? "System"}</td>
                  <td className="px-5 py-2.5 text-navy-500">{a.actor_role ?? "—"}</td>
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{a.action}</td>
                  <td className="px-5 py-2.5 text-navy-500">{a.entity_type ?? "—"} {a.entity_id ? `#${a.entity_id.slice(0, 8)}` : ""}</td>
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