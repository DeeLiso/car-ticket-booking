import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ChartSkeleton, SkeletonPage, StatGridSkeleton } from "@/components/common/Skeleton";
import { adminApi } from "@/services/endpoints";
import { StatCard, AreaChart, DonutChart, BarList } from "@/components/dashboard/Stat";
import { fmtMoney } from "@/utils/format";

export function AdminDashboardPage() {
  const q = useQuery({ queryKey: ["admin-dash"], queryFn: adminApi.dashboard });

  if (q.isLoading)
    return (
      <SkeletonPage label="Loading dashboard" actions={1}>
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
        title="Admin dashboard"
        subtitle="Platform-wide performance and health."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Net revenue" value={fmtMoney(stats.net_revenue)} accent icon="💰" hint={`${fmtMoney(stats.total_revenue)} gross`} />
        <StatCard label="Confirmed bookings" value={stats.confirmed_bookings} icon="🎫" hint={`${stats.pending_payments} pending payment`} />
        <StatCard label="Seats sold" value={stats.seats_sold} icon="🪑" hint={`${Math.round(stats.occupancy_rate * 100)}% occupancy`} />
        <StatCard label="Passengers" value={stats.total_passengers} icon="👥" hint={`${stats.total_operators} operators`} />
        <StatCard label="Trips" value={stats.total_trips} icon="🚌" hint={`${stats.total_buses} buses`} />
        <StatCard label="Routes" value={stats.total_routes} icon="🗺️" hint={`${stats.total_bookings} total bookings`} />
        <StatCard label="Cancelled" value={stats.cancelled_bookings} icon="✖️" hint={`${stats.refunded_amount ? fmtMoney(stats.refunded_amount) + " refunded" : "No refunds"}`} />
        <StatCard label="Operators" value={stats.total_operators} icon="🏢" hint="Verified partners" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-900">Booking trend</h3>
            <span className="text-xs text-navy-400">Hover for details</span>
          </div>
          <AreaChart data={charts.booking_trend} />
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-900">Revenue trend</h3>
            <span className="text-xs text-navy-400">Hover for details</span>
          </div>
          <AreaChart data={charts.revenue_trend} formatValue={(v) => fmtMoney(v)} />
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-900">Popular routes</h3>
          <BarList data={charts.popular_routes} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-900">Bus types</h3>
          <BarList data={charts.bus_type_distribution} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-900">Payment status</h3>
          <DonutChart data={charts.payment_status_distribution} />
        </Card>
      </div>
    </div>
  );
}
