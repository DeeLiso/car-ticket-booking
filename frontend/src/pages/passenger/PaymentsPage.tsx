import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/common/Badge";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { meApi } from "@/services/endpoints";
import { fmtDateTime, fmtMoney } from "@/utils/format";

export function PaymentsPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["me", "payments"], queryFn: () => meApi.payments(100) });

  if (q.isLoading)
    return (
      <SkeletonPage label={t("payments.loading")}>
        <ListSkeleton rows={4} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const items = q.data!;
  const succeeded = items.filter((p) => p.status === "SUCCEEDED");
  const totalPaid = succeeded.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("payments.title")} subtitle={t("payments.subtitle")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label={t("payments.stats.count")} value={String(succeeded.length)} />
        <StatTile label={t("payments.stats.totalPaid")} value={fmtMoney(totalPaid)} />
        <StatTile label={t("payments.stats.methods")} value={String(new Set(succeeded.map((p) => p.method)).size)} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="💳"
          title={t("payments.empty.title")}
          description={t("payments.empty.description")}
          action={
            <Link to="/search">
              <span className="btn-primary">{t("payments.empty.action")}</span>
            </Link>
          }
        />
      ) : (
        <Card className="divide-y divide-navy-100">
          {items.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={t(`payments.status.${p.status}`, p.status)} />
                  <span className="font-semibold text-navy-900">{p.method}</span>
                  <span className="text-xs text-navy-400">{p.provider}</span>
                </div>
                <p className="mt-1 flex flex-wrap gap-3 text-xs text-navy-400">
                  <span>{t("payments.ref", { ref: p.transaction_ref })}</span>
                  <span>{fmtDateTime(p.paid_at ?? p.initiated_at)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-extrabold text-navy-900">{fmtMoney(p.amount)}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-navy-900">{value}</p>
    </Card>
  );
}
