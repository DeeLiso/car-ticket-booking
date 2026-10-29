import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Clock,
  Edit2,
  Gauge,
  MapPin,
  Plus,
  Power,
  Route as RouteIcon,
  Search,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Field, Input, Select } from "@/components/common/Field";
import { Button } from "@/components/common/Button";
import { adminApi, catalogApi } from "@/services/endpoints";
import { durationText } from "@/utils/format";
import type { RouteOut } from "@/types";

const EMPTY_FORM = {
  origin_city_id: "",
  destination_city_id: "",
  duration_minutes: 180,
  distance_km: "",
};

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "route" | "durationAsc" | "durationDesc";

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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
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

export function AdminRoutesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RouteOut | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("route");

  const routes = useQuery({ queryKey: ["admin-routes"], queryFn: adminApi.routes });
  const cities = useQuery({ queryKey: ["cities"], queryFn: catalogApi.cities });

  const sortedCities = useMemo(() => {
    const list = [...(cities.data ?? [])];
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [cities.data]);

  const cityNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const city of cities.data ?? []) map.set(city.id, city.name);
    return map;
  }, [cities.data]);

  const cityLabel = (name?: string | null) => (name ? t(`admin.cities.${name}`, { defaultValue: name }) : "—");

  const cityName = (id: string) => cityNames.get(id) ?? id;

  const routeLabel = (r: RouteOut) => ({
    origin: cityLabel(r.origin_city?.name ?? cityName(r.origin_city_id)),
    destination: cityLabel(r.destination_city?.name ?? cityName(r.destination_city_id)),
  });

  const allRoutes = useMemo(() => routes.data ?? [], [routes.data]);

  const stats = useMemo(() => {
    const cityIds = new Set<string>();
    let active = 0;
    let totalMinutes = 0;
    for (const r of allRoutes) {
      cityIds.add(r.origin_city_id);
      cityIds.add(r.destination_city_id);
      if (r.is_active) active += 1;
      totalMinutes += r.duration_minutes;
    }
    return {
      total: allRoutes.length,
      active,
      cities: cityIds.size,
      avgMinutes: allRoutes.length ? Math.round(totalMinutes / allRoutes.length) : 0,
    };
  }, [allRoutes]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = (id: string) => {
      if (!term) return true;
      const raw = cityNames.get(id) ?? "";
      const label = t(`admin.cities.${raw}`, { defaultValue: raw }).toLowerCase();
      return raw.toLowerCase().includes(term) || label.includes(term);
    };

    const list = allRoutes.filter((r) => {
      if (status === "active" && !r.is_active) return false;
      if (status === "inactive" && r.is_active) return false;
      return matches(r.origin_city_id) || matches(r.destination_city_id);
    });

    return list.sort((a, b) => {
      if (sort === "durationAsc") return a.duration_minutes - b.duration_minutes;
      if (sort === "durationDesc") return b.duration_minutes - a.duration_minutes;
      const left = `${cityNames.get(a.origin_city_id) ?? ""}${cityNames.get(a.destination_city_id) ?? ""}`;
      const right = `${cityNames.get(b.origin_city_id) ?? ""}${cityNames.get(b.destination_city_id) ?? ""}`;
      return left.localeCompare(right);
    });
  }, [allRoutes, cityNames, search, sort, status, t]);

  const filtersActive = search.trim() !== "" || status !== "all" || sort !== "route";

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setSort("route");
  };

  const toggleForm = () => {
    if (open && !editing) cancelForm();
    else setOpen((o) => !o);
    window.scrollTo({ top: 0 });
  };

  const create = useMutation({
    mutationFn: () =>
      adminApi.createRoute({
        origin_city_id: form.origin_city_id,
        destination_city_id: form.destination_city_id,
        duration_minutes: Number(form.duration_minutes),
        distance_km: form.distance_km ? Number(form.distance_km) : undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      setError("");
      setForm({ ...EMPTY_FORM });
      qc.invalidateQueries({ queryKey: ["admin-routes"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const update = useMutation({
    mutationFn: (id: string) =>
      adminApi.updateRoute(id, {
        duration_minutes: Number(form.duration_minutes),
        distance_km: form.distance_km ? Number(form.distance_km) : null,
        is_active: editing?.is_active ?? true,
      }),
    onSuccess: () => {
      setEditing(null);
      setOpen(false);
      setError("");
      setForm({ ...EMPTY_FORM });
      qc.invalidateQueries({ queryKey: ["admin-routes"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const toggleActive = useMutation({
    mutationFn: (r: RouteOut) => adminApi.updateRoute(r.id, { is_active: !r.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-routes"] }),
    onError: (e) => setError((e as Error).message),
  });

  const startEdit = (r: RouteOut) => {
    setEditing(r);
    setOpen(true);
    setForm({
      origin_city_id: r.origin_city_id,
      destination_city_id: r.destination_city_id,
      duration_minutes: r.duration_minutes,
      distance_km: r.distance_km != null ? String(r.distance_km) : "",
    });
    setError("");
    window.scrollTo({ top: 0 });
  };

  const cancelForm = () => {
    setEditing(null);
    setOpen(false);
    setForm({ ...EMPTY_FORM });
    setError("");
  };

  const isSubmitting = create.isPending || update.isPending;

  if (routes.isLoading || cities.isLoading)
    return (
      <SkeletonPage label={t("admin.routes.loading")} actions={1}>
        <TableSkeleton columns={5} rows={6} />
      </SkeletonPage>
    );
  if (routes.error || cities.error)
    return (
      <div className="px-8 py-10">
        <InlineError
          message={((routes.error ?? cities.error) as Error).message}
          onRetry={() => {
            routes.refetch();
            cities.refetch();
          }}
        />
      </div>
    );

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={t("admin.routes.title")}
        subtitle={t("admin.routes.subtitle")}
        actions={
          <Button className="hidden sm:inline-flex" onClick={toggleForm}>
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {open ? t("admin.routes.close") : t("admin.routes.newRoute")}
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t("admin.routes.statsTotal")}
          value={String(stats.total)}
          tone="navy"
          icon={<RouteIcon className="h-4 w-4" />}
        />
        <StatTile
          label={t("admin.routes.statsActive")}
          value={String(stats.active)}
          tone="emerald"
          icon={<Power className="h-4 w-4" />}
        />
        <StatTile
          label={t("admin.routes.statsCities")}
          value={String(stats.cities)}
          tone="brand"
          icon={<MapPin className="h-4 w-4" />}
        />
        <StatTile
          label={t("admin.routes.statsAvg")}
          value={durationText(stats.avgMinutes)}
          tone="amber"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {error && (
        <div className="mb-5">
          <InlineError message={error} />
        </div>
      )}

      {open && (
        <Card className="mb-6 overflow-hidden p-0">
          <div className="flex items-start justify-between gap-3 border-b border-navy-100 bg-navy-50/60 px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm"
              >
                <RouteIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-navy-900">
                  {editing
                    ? t("admin.routes.editTitle", {
                        origin: cityLabel(editing.origin_city?.name ?? cityName(editing.origin_city_id)),
                        destination: cityLabel(
                          editing.destination_city?.name ?? cityName(editing.destination_city_id),
                        ),
                      })
                    : t("admin.routes.newRoute")}
                </p>
                <p className="mt-0.5 text-xs text-navy-500">{t("admin.routes.formHint")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelForm}
              aria-label={t("admin.routes.closeFormAria")}
              title={t("admin.routes.closeFormAria")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-navy-400 transition hover:bg-white hover:text-navy-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (form.origin_city_id === form.destination_city_id) {
                setError(t("admin.routes.diffError"));
                return;
              }
              if (editing) update.mutate(editing.id);
              else create.mutate();
            }}
          >
            <Field label={t("admin.routes.origin")}>
              <Select
                value={form.origin_city_id}
                onChange={(e) => setForm({ ...form, origin_city_id: e.target.value })}
                disabled={!!editing}
              >
                <option value="" disabled>
                  {t("admin.routes.choose")}
                </option>
                {sortedCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cityLabel(c.name)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("admin.routes.destination")}>
              <Select
                value={form.destination_city_id}
                onChange={(e) => setForm({ ...form, destination_city_id: e.target.value })}
                disabled={!!editing}
              >
                <option value="" disabled>
                  {t("admin.routes.choose")}
                </option>
                {sortedCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cityLabel(c.name)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("admin.routes.durationMin")}>
              <Input
                type="number"
                min={30}
                max={600}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("admin.routes.distanceKmOptional")}>
              <Input
                type="number"
                min={1}
                max={5000}
                step="0.1"
                placeholder={t("admin.routes.distancePlaceholder")}
                value={form.distance_km}
                onChange={(e) => setForm({ ...form, distance_km: e.target.value })}
              />
            </Field>

            {editing && (
              <div className="md:col-span-2 xl:col-span-4">
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/60 px-3 py-2 text-sm font-medium text-navy-700">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-navy-300 text-brand-600 accent-brand-600"
                  />
                  {t("admin.routes.activeRoute")}
                </label>
              </div>
            )}

            <div className="flex items-center gap-3 border-t border-navy-100 pt-4 md:col-span-2 xl:col-span-4">
              <Button type="submit" loading={isSubmitting}>
                {editing ? t("admin.routes.saveChanges") : t("admin.routes.create")}
              </Button>
              <Button variant="ghost" onClick={cancelForm} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mb-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.routes.searchPlaceholder")}
              aria-label={t("admin.routes.searchPlaceholder")}
              className="pr-9 pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("admin.routes.clearSearch")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-navy-400 transition hover:bg-navy-100 hover:text-navy-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            aria-label={t("admin.routes.filterLabel")}
            className="sm:w-44"
          >
            <option value="all">{t("admin.routes.filterAll")}</option>
            <option value="active">{t("admin.routes.filterActive")}</option>
            <option value="inactive">{t("admin.routes.filterInactive")}</option>
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label={t("admin.routes.sortLabel")}
            className="sm:w-48"
          >
            <option value="route">{t("admin.routes.sortRoute")}</option>
            <option value="durationAsc">{t("admin.routes.sortDurationAsc")}</option>
            <option value="durationDesc">{t("admin.routes.sortDurationDesc")}</option>
          </Select>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-navy-50 pt-2.5 text-xs text-navy-500">
          <span>{t("admin.routes.resultsCount", { count: visible.length })}</span>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-semibold text-brand-700 transition hover:text-brand-800 hover:underline"
            >
              {t("admin.routes.clearFilters")}
            </button>
          )}
        </div>
      </Card>

      {visible.length === 0 ? (
        allRoutes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="h-10 w-10 text-navy-300" aria-hidden="true" />}
            title={t("admin.routes.noRoutes")}
            description={t("admin.routes.noRoutesHint")}
            action={<Button onClick={() => setOpen(true)}>{t("admin.routes.newRoute")}</Button>}
          />
        ) : (
          <EmptyState
            icon={<Search className="h-10 w-10 text-navy-300" aria-hidden="true" />}
            title={t("admin.routes.noResults")}
            description={t("admin.routes.noResultsHint")}
            action={
              <Button variant="ghost" onClick={resetFilters}>
                {t("admin.routes.clearFilters")}
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {visible.map((r) => {
              const { origin, destination } = routeLabel(r);
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 flex-wrap items-center gap-1.5 font-display text-base font-bold text-navy-900">
                      <span className="truncate">{origin}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-navy-300" aria-hidden="true" />
                      <span className="truncate">{destination}</span>
                    </p>
                    <StatusPill
                      active={r.is_active}
                      label={r.is_active ? t("admin.routes.activeLabel") : t("admin.routes.inactiveLabel")}
                    />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-navy-100 bg-navy-50/50 px-3 py-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                        {t("admin.routes.duration")}
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-navy-800">
                        <Clock className="h-3.5 w-3.5 text-navy-400" aria-hidden="true" />
                        {durationText(r.duration_minutes)}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-navy-100 bg-navy-50/50 px-3 py-2">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                        {t("admin.routes.distance")}
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-navy-800">
                        <Gauge className="h-3.5 w-3.5 text-navy-400" aria-hidden="true" />
                        {r.distance_km != null ? t("admin.routes.distanceValue", { value: r.distance_km }) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center gap-2 border-t border-navy-50 pt-3">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                      <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("common.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant={r.is_active ? "ghost" : "brand"}
                      onClick={() => toggleActive.mutate(r)}
                      aria-label={r.is_active ? t("admin.routes.disableAria") : t("admin.routes.enableAria")}
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden="true" />
                      {r.is_active ? t("admin.routes.disable") : t("admin.routes.enable")}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="hidden overflow-hidden p-0 sm:block">
            <div className="flex items-center justify-between gap-3 border-b border-navy-100 px-5 py-3.5">
              <h2 className="font-display text-sm font-bold text-navy-900">
                {t("admin.routes.listTitle")}
              </h2>
              <span className="text-xs font-medium text-navy-400">
                {t("admin.routes.resultsCount", { count: visible.length })}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50/70 text-left text-[11px] uppercase tracking-wide text-navy-500">
                    <th className="px-5 py-2.5 font-semibold">{t("admin.routes.route")}</th>
                    <th className="px-5 py-2.5 font-semibold">{t("admin.routes.duration")}</th>
                    <th className="px-5 py-2.5 font-semibold">{t("admin.routes.distanceKm")}</th>
                    <th className="px-5 py-2.5 font-semibold">{t("admin.routes.active")}</th>
                    <th className="px-5 py-2.5 text-right font-semibold">{t("admin.routes.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {visible.map((r) => {
                    const { origin, destination } = routeLabel(r);
                    return (
                      <tr key={r.id} className="transition-colors hover:bg-navy-50/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 font-semibold text-navy-900">
                            <span>{origin}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-navy-300" aria-hidden="true" />
                            <span>{destination}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-navy-400">
                            {r.origin_city?.region} → {r.destination_city?.region}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-navy-600">
                            <Clock className="h-3.5 w-3.5 text-navy-400" aria-hidden="true" />
                            {durationText(r.duration_minutes)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 text-navy-600">
                            <Gauge className="h-3.5 w-3.5 text-navy-400" aria-hidden="true" />
                            {r.distance_km != null
                              ? t("admin.routes.distanceValue", { value: r.distance_km })
                              : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <StatusPill
                            active={r.is_active}
                            label={r.is_active ? t("admin.routes.activeLabel") : t("admin.routes.inactiveLabel")}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(r)}
                              aria-label={t("admin.routes.editAria", { origin, destination })}
                              title={t("common.edit")}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive.mutate(r)}
                              aria-label={r.is_active ? t("admin.routes.disableAria") : t("admin.routes.enableAria")}
                              title={r.is_active ? t("admin.routes.disableAria") : t("admin.routes.enableAria")}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${
                                r.is_active
                                  ? "text-navy-500 hover:bg-red-50 hover:text-red-600"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              <Power className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <button
        type="button"
        onClick={toggleForm}
        aria-label={open ? t("admin.routes.closeFormAria") : t("admin.routes.newRoute")}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow transition active:scale-95 sm:hidden"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
