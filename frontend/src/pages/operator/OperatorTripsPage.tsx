import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/common/Badge";
import { EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { operatorApi } from "@/services/endpoints";
import { fmtClock, fmtDate, fmtMoney } from "@/utils/format";

export function OperatorTripsPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["op-trips"], queryFn: operatorApi.trips });

  const statusText = (code: string) => t(`operator.status.${code}`, { defaultValue: code });
  const cityText = (name?: string | null) => (name ? t(`operator.cities.${name}`, { defaultValue: name }) : "—");

  if (q.isLoading)
    return (
      <SkeletonPage label={t("operator.trips.loading")}>
        <ListSkeleton rows={4} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const trips = q.data ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("operator.trips.title")} subtitle={t("operator.trips.subtitle")} />
      {trips.length === 0 && <EmptyState icon="🚌" title={t("operator.trips.emptyTitle")} description={t("operator.trips.emptyDesc")} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {trips.map((trip, i) => (
          <Link
            key={trip.id}
            to={`/operator/trips/${trip.id}/manifest`}
            className="group block animate-[fade-up_0.4s_ease-out] [animation-fill-mode:both]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151D2E] text-white shadow-[0_10px_40px_-18px_rgba(5,10,24,0.95)] transition duration-300 hover:-translate-y-1 hover:border-brand-400/50 hover:shadow-[0_20px_60px_-18px_rgba(36,69,224,0.55)]">
              <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-brand-600/10 blur-[120px]" />
              <div className="pointer-events-none absolute -left-24 bottom-0 h-60 w-60 rounded-full bg-brand-500/12 blur-[110px]" />
              <div className="relative z-10 flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-400/40 bg-brand-600/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-100 shadow-[0_0_30px_-12px_rgba(36,69,224,0.95)] backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-300 shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" />
                    {fmtClock(trip.departure_at)}
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-navy-300">{fmtDate(trip.departure_at)}</span>
                </div>

                <h3 className="mt-4 font-display text-lg font-bold leading-tight">{cityText(trip.origin)} → {cityText(trip.destination)}</h3>
                <p className="mt-1 line-clamp-1 text-sm text-navy-200">{trip.bus ?? "—"}</p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-200">
                  <span>{t("operator.trips.price", { value: fmtMoney(trip.base_price) })}</span>
                  <span>{t("operator.trips.capacity", { value: trip.total_seats ?? 0 })}</span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-navy-300">
                    <span>{t("operator.trips.seatsSold")}</span>
                    <span>{trip.seats_sold ?? 0} / {trip.total_seats ?? 0}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 shadow-[0_0_28px_-10px_rgba(36,69,224,0.9)] transition-[width] duration-500"
                      style={{ width: `${Math.min(100, ((trip.seats_sold ?? 0) / Math.max(1, trip.total_seats ?? 0)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Badge label={statusText(trip.status)} />
                  <span className="group/btn inline-flex items-center gap-1 text-sm font-semibold text-brand-200 transition group-hover:text-white">
                    {t("operator.trips.manifest")}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
