import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { adminApi } from "@/services/endpoints";
import { fmtDateTime, fmtMoney } from "@/utils/format";

export function AdminRefundsPage() {
  const { t } = useTranslation();
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

  if (q.isLoading)
    return (
      <SkeletonPage label={t("admin.refunds.loading")}>
        <TableSkeleton columns={6} rows={5} />
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
      <PageHeader
        title={t("admin.refunds.title")}
        subtitle={t("admin.refunds.subtitle")}
        actions={
          <Link
            to="/operator/scan"
            className="btn-brand min-h-10 px-4 py-2 text-sm shadow-sm"
            title={t("admin.refunds.openScannerHint")}
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            {t("admin.refunds.openScanner")}
          </Link>
        }
      />
      <div className="space-y-3 sm:hidden">
        {items.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-sm font-bold text-navy-900">{r.reference}</p>
              <Badge label={t(`admin.status.${r.status}`, { defaultValue: r.status })} />
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.refunds.amount")}</dt>
                <dd className="font-semibold text-navy-900">{fmtMoney(r.amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.refunds.reason")}</dt>
                <dd className="break-all text-right font-medium text-navy-800">{r.reason ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="shrink-0 text-navy-500">{t("admin.refunds.created")}</dt>
                <dd className="text-right font-medium text-navy-800">{fmtDateTime(r.created_at)}</dd>
              </div>
            </dl>
            {(r.status === "REQUESTED" || r.status === "APPROVED") && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-navy-100 pt-3">
                {r.status === "REQUESTED" && (
                  <>
                    <Button size="sm" variant="ghost" loading={approve.isPending} onClick={() => approve.mutate(r.id)}>{t("admin.refunds.approve")}</Button>
                    <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(r.id)}>{t("admin.refunds.reject")}</Button>
                  </>
                )}
                {r.status === "APPROVED" && (
                  <Button size="sm" loading={process.isPending} onClick={() => process.mutate(r.id)}>{t("admin.refunds.markProcessed")}</Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="hidden p-0 sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">{t("admin.refunds.ref")}</th>
                <th className="px-5 py-3">{t("admin.refunds.amount")}</th>
                <th className="px-5 py-3">{t("admin.refunds.reason")}</th>
                <th className="px-5 py-3">{t("admin.refunds.status")}</th>
                <th className="px-5 py-3">{t("admin.refunds.created")}</th>
                <th className="px-5 py-3">{t("admin.refunds.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-mono text-xs text-navy-500">{r.reference}</td>
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{fmtMoney(r.amount)}</td>
                  <td className="px-5 py-2.5 text-navy-500">{r.reason ?? "—"}</td>
                  <td className="px-5 py-2.5 text-navy-500">{t(`admin.status.${r.status}`, { defaultValue: r.status })}</td>
                  <td className="px-5 py-2.5 text-navy-500">{fmtDateTime(r.created_at)}</td>
                  <td className="flex flex-wrap gap-2 px-5 py-2.5">
                    {r.status === "REQUESTED" && (
                      <>
                        <Button size="sm" variant="ghost" loading={approve.isPending} onClick={() => approve.mutate(r.id)}>{t("admin.refunds.approve")}</Button>
                        <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(r.id)}>{t("admin.refunds.reject")}</Button>
                      </>
                    )}
                    {r.status === "APPROVED" && (
                      <Button size="sm" loading={process.isPending} onClick={() => process.mutate(r.id)}>{t("admin.refunds.markProcessed")}</Button>
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