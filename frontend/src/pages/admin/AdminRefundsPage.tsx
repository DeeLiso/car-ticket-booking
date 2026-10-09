import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { adminApi } from "@/services/endpoints";
import { fmtDateTime, fmtMoney } from "@/utils/format";

export function AdminRefundsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-refunds"], queryFn: adminApi.refunds });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveRefund(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectRefund(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });
  const process = useMutation({
    mutationFn: (id: string) => adminApi.processRefund(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-refunds"] }),
  });

  if (q.isLoading) return <PageLoader />;
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const items = q.data ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="Refunds" subtitle="Review and settle passenger refund requests." />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Ref</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-mono text-xs text-navy-500">{r.reference}</td>
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{fmtMoney(r.amount)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{r.reason ?? "—"}</td>
                  <td className="px-5 py-2.5 text-navy-500">{r.status}</td>
                  <td className="px-5 py-2.5 text-navy-500">{fmtDateTime(r.created_at)}</td>
                  <td className="flex flex-wrap gap-2 px-5 py-2.5">
                    {r.status === "REQUESTED" && (
                      <>
                        <Button size="sm" variant="ghost" loading={approve.isPending} onClick={() => approve.mutate(r.id)}>Approve</Button>
                        <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(r.id)}>Reject</Button>
                      </>
                    )}
                    {r.status === "APPROVED" && (
                      <Button size="sm" loading={process.isPending} onClick={() => process.mutate(r.id)}>Mark processed</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}