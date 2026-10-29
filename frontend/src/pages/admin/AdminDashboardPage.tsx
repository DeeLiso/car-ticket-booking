import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ChartSkeleton, SkeletonPage, StatGridSkeleton } from "@/components/common/Skeleton";
import { adminApi } from "@/services/endpoints";
import { StatCard, AreaChart, DonutChart, BarList } from "@/components/dashboard/Stat";
import { fmtMoney } from "@/utils/format";

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["admin-dash"], queryFn: adminApi.dashboard });

  if (q.isLoading)
    return (
      <SkeletonPage label={t("admin.dashboard.loading")} actions={1}>
        <StatGridSkeleton count={8} />
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const d = q.data!;
  const stats = d.stats;
  const charts = d.charts;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={t("admin.dashboard.title")}
        subtitle={t("admin.dashboard.subtitle")}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("admin.dashboard.live")}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("admin.dashboard.netRevenue")} value={fmtMoney(stats.net_revenue)} accent icon="💰" hint={t("admin.dashboard.grossRevenue", { value: fmtMoney(stats.total_revenue) })} />
        <StatCard label={t("admin.dashboard.confirmedBookings")} value={stats.confirmed_bookings} icon="🎫" hint={t("admin.dashboard.pendingPayment", { count: stats.pending_payments })} />
        <StatCard label={t("admin.dashboard.seatsSold")} value={stats.seats_sold} icon="🪑" hint={t("admin.dashboard.occupancy", { value: Math.round(stats.occupancy_rate * 100) })} />
        <StatCard label={t("admin.dashboard.passengers")} value={stats.total_passengers} icon="👥" hint={t("admin.dashboard.operatorsHint", { count: stats.total_operators })} />
        <StatCard label={t("admin.dashboard.trips")} value={stats.total_trips} icon="🚌" hint={t("admin.dashboard.busesHint", { count: stats.total_buses })} />
        <StatCard label={t("admin.dashboard.routes")} value={stats.total_routes} icon="🗺️" hint={t("admin.dashboard.totalBookings", { count: stats.total_bookings })} />
        <StatCard label={t("admin.dashboard.cancelled")} value={stats.cancelled_bookings} icon="✖️" hint={stats.refunded_amount ? t("admin.dashboard.refunded", { value: fmtMoney(stats.refunded_amount) }) : t("admin.dashboard.noRefunds")} />
        <StatCard label={t("admin.dashboard.operators")} value={stats.total_operators} icon="🏢" hint={t("admin.dashboard.verifiedPartners")} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-900">{t("admin.dashboard.bookingTrend")}</h3>
            <span className="text-xs text-navy-400">{t("admin.dashboard.hoverForDetails")}</span>
          </div>
          <AreaChart data={charts.booking_trend} />
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-900">{t("admin.dashboard.revenueTrend")}</h3>
            <span className="text-xs text-navy-400">{t("admin.dashboard.hoverForDetails")}</span>
          </div>
          <AreaChart data={charts.revenue_trend} formatValue={(v) => fmtMoney(v)} />
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-900">{t("admin.dashboard.popularRoutes")}</h3>
          <BarList data={charts.popular_routes} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-900">{t("admin.dashboard.busTypes")}</h3>
          <BarList data={charts.bus_type_distribution} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-900">{t("admin.dashboard.paymentStatus")}</h3>
          <DonutChart data={charts.payment_status_distribution} />
        </Card>
      </div>
    </div>
  );
}
