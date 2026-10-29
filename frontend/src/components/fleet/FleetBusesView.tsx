import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Armchair,
  ArrowRight,
  BusFront,
  CalendarClock,
  LayoutGrid,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { Input, Select } from "@/components/common/Field";
import { FleetRouteMap, type MapRoute } from "@/components/maps/FleetRouteMap";
import { FLEET_COLORS } from "@/utils/geo";
import { fmtDate } from "@/utils/format";

export interface FleetBusRow {
  id: string;
  name: string;
  registration_number: string;
  bus_type: string;
  layout: string;
  seat_capacity: number;
  is_active: boolean;
  operator?: string | null;
  origin?: string | null;
  destination?: string | null;
  latestTripAt?: string | null;
}

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "seats" | "recent";

const TILE_TONES = {
  navy: "bg-navy-50 text-navy-600",
  emerald: "bg-emerald-50 text-emerald-600",
  brand: "bg-brand-50 text-brand-700",
  amber: "bg-amber-50 text-amber-600",
} as const;

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: keyof typeof TILE_TONES;
}) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TILE_TONES[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 truncate font-display text-xl font-extrabold tabular-nums text-navy-900 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-navy-200 bg-navy-50 text-navy-500"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-navy-400"}`}
      />
      {label}
    </span>
  );
}

function SpecChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-100 bg-navy-50/60 px-2.5 py-0.5 text-[11px] font-semibold text-navy-600">
      <span aria-hidden="true" className="text-navy-400">
        {icon}
      </span>
      {children}
    </span>
  );
}

export function FleetBusesView({
  title,
  subtitle,
  rows,
  showOperator = false,
  darkMap = false,
  loading,
  error,
  onRetry,
}: {
  title: string;
  subtitle: string;
  rows: FleetBusRow[];
  showOperator?: boolean;
  darkMap?: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const routedRows = useMemo(() => rows.filter((r) => r.origin && r.destination), [rows]);

  const colorByBus = useMemo(() => {
    const m = new Map<string, string>();
    routedRows.forEach((r, i) => m.set(r.id, FLEET_COLORS[i % FLEET_COLORS.length]!));
    return m;
  }, [routedRows]);

  const stats = useMemo(() => {
    const operators = new Set<string>();
    let active = 0;
    let seats = 0;
    for (const r of rows) {
      if (r.is_active) active += 1;
      seats += r.seat_capacity;
      if (r.operator) operators.add(r.operator);
    }
    return {
      total: rows.length,
      active,
      seats,
      operators: operators.size,
      routed: routedRows.length,
    };
  }, [rows, routedRows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const match = (value?: string | null) => (value ?? "").toLowerCase().includes(term);

    const list = rows.filter((r) => {
      if (status === "active" && !r.is_active) return false;
      if (status === "inactive" && r.is_active) return false;
      if (!term) return true;
      return (
        match(r.name) ||
        match(r.registration_number) ||
        match(r.operator) ||
        match(r.origin) ||
        match(r.destination) ||
        match(r.bus_type)
      );
    });

    return list.sort((a, b) => {
      if (sort === "seats") return b.seat_capacity - a.seat_capacity;
      if (sort === "recent") {
        const left = a.latestTripAt ? Date.parse(a.latestTripAt) : 0;
        const right = b.latestTripAt ? Date.parse(b.latestTripAt) : 0;
        return right - left;
      }
      return a.name.localeCompare(b.name);
    });
  }, [rows, search, sort, status]);

  const mapRoutes: MapRoute[] = useMemo(
    () =>
      visible
        .filter((r) => r.origin && r.destination)
        .map((r) => ({
          id: r.id,
          origin: r.origin!,
          destination: r.destination!,
          color: colorByBus.get(r.id) ?? FLEET_COLORS[0]!,
        })),
    [visible, colorByBus],
  );

  const legendRows = useMemo(
    () => visible.filter((r) => colorByBus.has(r.id)),
    [visible, colorByBus],
  );

  const filtersActive = search.trim() !== "" || status !== "all" || sort !== "name";

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setSort("name");
  };

  if (loading)
    return (
      <SkeletonPage label={t("fleet.loading")}>
        <ListSkeleton rows={3} />
      </SkeletonPage>
    );
  if (error)
    return (
      <div className="px-8 py-10">
        <InlineError message={error} onRetry={onRetry} />
      </div>
    );

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={title} subtitle={subtitle} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<BusFront className="h-10 w-10 text-navy-300" aria-hidden="true" />}
          title={t("fleet.emptyTitle")}
          description={t("fleet.emptyDesc")}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={t("fleet.statsTotal")}
              value={String(stats.total)}
              tone="navy"
              icon={<BusFront className="h-4 w-4" />}
            />
            <StatTile
              label={t("fleet.statsActive")}
              value={String(stats.active)}
              tone="emerald"
              icon={<MapPin className="h-4 w-4" />}
            />
            <StatTile
              label={t("fleet.statsSeats")}
              value={String(stats.seats)}
              tone="brand"
              icon={<Armchair className="h-4 w-4" />}
            />
            <StatTile
              label={showOperator ? t("fleet.statsOperators") : t("fleet.statsRouted")}
              value={String(showOperator ? stats.operators : stats.routed)}
              tone="amber"
              icon={showOperator ? <Users className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            />
          </div>

          <Card className="mb-5 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("fleet.searchPlaceholder")}
                  aria-label={t("fleet.searchPlaceholder")}
                  className="pr-9 pl-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label={t("fleet.clearSearch")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-navy-400 transition hover:bg-navy-100 hover:text-navy-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                aria-label={t("fleet.filterLabel")}
                className="sm:w-44"
              >
                <option value="all">{t("fleet.filterAll")}</option>
                <option value="active">{t("fleet.filterActive")}</option>
                <option value="inactive">{t("fleet.filterInactive")}</option>
              </Select>
              <Select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label={t("fleet.sortLabel")}
                className="sm:w-48"
              >
                <option value="name">{t("fleet.sortName")}</option>
                <option value="seats">{t("fleet.sortSeats")}</option>
                <option value="recent">{t("fleet.sortRecent")}</option>
              </Select>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-navy-50 pt-2.5 text-xs text-navy-500">
              <span>{t("fleet.resultsCount", { count: visible.length })}</span>
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-semibold text-brand-700 transition hover:text-brand-800 hover:underline"
                >
                  {t("fleet.clearFilters")}
                </button>
              )}
            </div>
          </Card>

          {visible.length === 0 ? (
            <EmptyState
              icon={<Search className="h-10 w-10 text-navy-300" aria-hidden="true" />}
              title={t("fleet.noResults")}
              description={t("fleet.noResultsHint")}
              action={
                <button
                  type="button"
                  onClick={resetFilters}
                  className="btn-ghost px-4 py-2 text-sm"
                >
                  {t("fleet.clearFilters")}
                </button>
              }
            />
          ) : (
            <>
              {mapRoutes.length > 0 && (
                <Card className={`overflow-hidden p-0 ${darkMap ? "border-[#1f2d49] bg-[#0b1220]" : ""}`}>
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                      darkMap ? "border-b border-[#1f2d49]" : "border-b border-navy-100"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`flex items-center gap-2 font-display text-sm font-bold ${darkMap ? "text-white" : "text-navy-900"}`}>
                        <MapPin className="h-4 w-4 text-brand-600" aria-hidden="true" />
                        {t("fleet.routesTitle")}
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                          {t("fleet.routesBadge", { count: mapRoutes.length })}
                        </span>
                      </p>
                      <p className={`mt-0.5 text-xs ${darkMap ? "text-navy-300" : "text-navy-500"}`}>
                        {t("fleet.routesSubtitle")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {legendRows.map((r) => (
                        <span
                          key={r.id}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${darkMap ? "text-navy-200" : "text-navy-700"}`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: colorByBus.get(r.id) }}
                          />
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="h-[340px] sm:h-[440px]">
                    <FleetRouteMap routes={mapRoutes} dark={darkMap} />
                  </div>
                </Card>
              )}

              <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-navy-900">{t("fleet.listTitle")}</h2>
                <span className="text-xs font-medium text-navy-400">
                  {t("fleet.resultsCount", { count: visible.length })}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((r) => {
                  const color = colorByBus.get(r.id);
                  return (
                    <Card
                      key={r.id}
                      className="group relative flex flex-col gap-3.5 overflow-hidden p-4 transition-shadow duration-200 hover:shadow-card-lg sm:p-5"
                    >
                      {color && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-0 top-0 h-1"
                          style={{ background: color }}
                        />
                      )}
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100"
                        >
                          <BusFront className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-base font-bold text-navy-900">{r.name}</p>
                          <p className="mt-0.5 truncate font-mono text-[11px] text-navy-500">
                            {r.registration_number}
                            {showOperator && r.operator ? ` · ${r.operator}` : ""}
                          </p>
                        </div>
                        <StatusPill
                          active={r.is_active}
                          label={r.is_active ? t("fleet.active") : t("fleet.inactive")}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <SpecChip icon={<BusFront className="h-3 w-3" />}>{r.bus_type}</SpecChip>
                        <SpecChip icon={<Armchair className="h-3 w-3" />}>
                          {t("fleet.seatsBadge", { count: r.seat_capacity })}
                        </SpecChip>
                        <SpecChip icon={<LayoutGrid className="h-3 w-3" />}>{r.layout}</SpecChip>
                      </div>

                      {r.origin && r.destination ? (
                        <div className="rounded-xl border border-navy-100 bg-navy-50 px-3 py-2.5 transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50">
                          <div className="flex items-center gap-2 text-sm font-bold text-navy-900">
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: color }}
                            />
                            <span className="truncate">{r.origin}</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
                            <span className="truncate">{r.destination}</span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-navy-500">
                            <CalendarClock className="h-3 w-3 shrink-0 text-navy-400" aria-hidden="true" />
                            {t("fleet.latestTrip")}
                            {r.latestTripAt ? ` · ${fmtDate(r.latestTripAt)}` : ""}
                          </p>
                        </div>
                      ) : (
                        <p className="flex items-start gap-2 rounded-xl border border-dashed border-navy-200 bg-navy-50 px-3 py-2.5 text-xs text-navy-500 transition-colors duration-200 hover:border-brand-200 hover:bg-brand-50">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" aria-hidden="true" />
                          {t("fleet.noRoute")}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
