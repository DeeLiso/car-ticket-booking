import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Ban, ClipboardList, Filter, Pencil, Play, Plus, X } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Field, Input, Select } from "@/components/common/Field";
import { GlassDatePicker, GlassSelect } from "@/components/common/GlassPicker";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { adminApi } from "@/services/endpoints";
import { durationText, fmtClock, fmtDate, fmtMoney } from "@/utils/format";
import type { TripSummary } from "@/types";

const STATUSES = ["SCHEDULED", "BOARDING", "DEPARTED", "COMPLETED", "CANCELLED"] as const;

const NEXT_STATUS: Record<string, string | null> = {
  SCHEDULED: "BOARDING",
  BOARDING: "DEPARTED",
  DEPARTED: "COMPLETED",
  COMPLETED: null,
  CANCELLED: null,
};

const EMPTY_FORM = {
  route_id: "",
  bus_id: "",
  departure_at: "",
  arrival_at: "",
  base_price: "",
  notes: "",
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function toIso(localValue: string): string {
  return new Date(localValue).toISOString();
}

function OccupancyBar({ sold, total }: { sold: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (sold / total) * 100) : 0;
  return (
    <div className="w-28">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-navy-400">
        <span>
          {sold}/{total}
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-navy-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AdminTripsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const statusText = useCallback((code: string) => t(`admin.status.${code}`, { defaultValue: code }), [t]);
  const cityLabel = useCallback((name?: string | null) => (name ? t(`admin.cities.${name}`, { defaultValue: name }) : "—"), [t]);

  const routeFilter = params.get("route") ?? "";
  const statusFilter = params.get("status") ?? "";
  const dateFilter = params.get("date") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? "1"));
  const size = Number(params.get("size") ?? "20");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TripSummary | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState("");

  const routes = useQuery({ queryKey: ["admin-routes"], queryFn: adminApi.routes });
  const fleet = useQuery({ queryKey: ["admin-fleet"], queryFn: adminApi.fleet });
  const list = useQuery({
    queryKey: ["admin-trips", { routeFilter, statusFilter, dateFilter, page, size }],
    queryFn: () =>
      adminApi.trips({
        route_id: routeFilter || undefined,
        status: statusFilter || undefined,
        departure_date: dateFilter || undefined,
        page,
        page_size: size,
      }),
  });

  const items = list.data?.items ?? [];
  const totalPages = list.data?.pages ?? 1;
  const total = list.data?.total ?? 0;

  const activeBuses = useMemo(
    () => (fleet.data ?? []).filter((b) => b.is_active),
    [fleet.data],
  );

  const routeOptions = useMemo(
    () => [
      { value: "", label: t("admin.trips.allRoutes") },
      ...(routes.data ?? []).map((r) => ({
        value: r.id,
        label: `${cityLabel(r.origin_city?.name ?? r.origin_city_id)} → ${cityLabel(r.destination_city?.name ?? r.destination_city_id)}`,
      })),
    ],
    [routes.data, t],
  );

  const statusOptions = useMemo(
    () => [{ value: "", label: t("admin.trips.allStatuses") }, ...STATUSES.map((s) => ({ value: s, label: statusText(s) }))],
    [t],
  );

  function patch(next: Record<string, string>) {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    setParams(p, { replace: true });
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-trips"] });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createTrip({
        route_id: form.route_id,
        bus_id: form.bus_id,
        departure_at: toIso(form.departure_at),
        arrival_at: toIso(form.arrival_at),
        base_price: Number(form.base_price),
        notes: form.notes || null,
      }),
    onSuccess: () => {
      setOpen(false);
      setError("");
      setForm({ ...EMPTY_FORM });
      invalidate();
    },
    onError: (e) => setError((e as Error).message),
  });

  const update = useMutation({
    mutationFn: (id: string) =>
      adminApi.updateTrip(id, {
        departure_at: toIso(form.departure_at),
        arrival_at: toIso(form.arrival_at),
        base_price: Number(form.base_price),
        notes: form.notes || null,
      }),
    onSuccess: () => {
      setEditing(null);
      setOpen(false);
      setError("");
      setForm({ ...EMPTY_FORM });
      invalidate();
    },
    onError: (e) => setError((e as Error).message),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateTrip(id, { status }),
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (e) => setError((e as Error).message),
  });

  const startEdit = (t: TripSummary) => {
    setEditing(t);
    setOpen(true);
    setForm({
      route_id: t.route_id,
      bus_id: t.bus?.id ?? "",
      departure_at: toLocalInput(t.departure_at),
      arrival_at: toLocalInput(t.arrival_at),
      base_price: String(t.base_price),
      notes: "",
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

  const onRouteChange = (routeId: string) => {
    const r = (routes.data ?? []).find((x) => x.id === routeId);
    const next = { ...form, route_id: routeId };
    if (!editing && r && form.departure_at) {
      const dep = new Date(form.departure_at);
      if (!Number.isNaN(dep.getTime())) {
        next.arrival_at = toLocalInput(
          new Date(dep.getTime() + r.duration_minutes * 60_000).toISOString(),
        );
      }
    }
    setForm(next);
  };

  const onDepartureChange = (value: string) => {
    const r = (routes.data ?? []).find((x) => x.id === form.route_id);
    const next = { ...form, departure_at: value };
    if (!editing && r && value) {
      const dep = new Date(value);
      if (!Number.isNaN(dep.getTime())) {
        next.arrival_at = toLocalInput(
          new Date(dep.getTime() + r.duration_minutes * 60_000).toISOString(),
        );
      }
    }
    setForm(next);
  };

  const submit = () => {
    setError("");
    if (!form.departure_at || !form.arrival_at) {
      setError(t("admin.trips.errTimes"));
      return;
    }
    if (new Date(form.arrival_at) <= new Date(form.departure_at)) {
      setError(t("admin.trips.errArrival"));
      return;
    }
    if (!(Number(form.base_price) > 0)) {
      setError(t("admin.trips.errPrice"));
      return;
    }
    if (editing) {
      update.mutate(editing.id);
      return;
    }
    if (!form.route_id || !form.bus_id) {
      setError(t("admin.trips.errRouteBus"));
      return;
    }
    create.mutate();
  };

  const isSubmitting = create.isPending || update.isPending;
  const hasFilters = routeFilter || statusFilter || dateFilter;

  if (routes.isLoading || list.isLoading)
    return (
      <SkeletonPage label={t("admin.trips.loading")} actions={1}>
        <TableSkeleton columns={6} rows={8} />
      </SkeletonPage>
    );
  if (list.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(list.error as Error).message} onRetry={() => list.refetch()} />
      </div>
    );

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={t("admin.trips.title")}
        subtitle={t("admin.trips.subtitle")}
        actions={
          <Button
            className="hidden sm:inline-flex"
            onClick={() => (open && !editing ? cancelForm() : setOpen(true))}
          >
            {open && !editing ? t("admin.trips.close") : t("admin.trips.newTrip")}
          </Button>
        }
      />

      {error && (
        <div className="mb-5">
          <InlineError message={error} />
        </div>
      )}

      {open && (
        <Card className="mb-6 p-5">
          <p className="font-display text-lg font-bold text-navy-900">
            {editing
              ? t("admin.trips.editTitle", { origin: cityLabel(editing.origin_city?.name) || t("admin.trips.editOriginFallback"), destination: cityLabel(editing.destination_city?.name) })
              : t("admin.trips.newTrip")}
          </p>
          <form
            className="mt-4 grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field label={t("admin.trips.route")}>
              <Select
                value={form.route_id}
                onChange={(e) => onRouteChange(e.target.value)}
                disabled={!!editing}
              >
                <option value="" disabled>
                  {t("admin.trips.choose")}
                </option>
                {(routes.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {cityLabel(r.origin_city?.name ?? r.origin_city_id)} → {cityLabel(r.destination_city?.name ?? r.destination_city_id)} ({durationText(r.duration_minutes)})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("admin.trips.bus")}>
              <Select
                value={form.bus_id}
                onChange={(e) => setForm({ ...form, bus_id: e.target.value })}
                disabled={!!editing}
              >
                <option value="" disabled>
                  {t("admin.trips.choose")}
                </option>
                {activeBuses.map((b) => (
                  <option key={b.bus_id} value={b.bus_id}>
                    {b.bus_name} ({b.registration_number}){b.operator ? ` — ${b.operator}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("admin.trips.priceMmk")}>
              <Input
                type="number"
                min={1}
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              />
            </Field>
            <Field label={t("admin.trips.departure")}>
              <Input
                type="datetime-local"
                value={form.departure_at}
                onChange={(e) => onDepartureChange(e.target.value)}
              />
            </Field>
            <Field label={t("admin.trips.arrival")}>
              <Input
                type="datetime-local"
                value={form.arrival_at}
                onChange={(e) => setForm({ ...form, arrival_at: e.target.value })}
              />
            </Field>
            <Field label={t("admin.trips.notesOptional")}>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("admin.trips.notesPlaceholder")}
              />
            </Field>
            <div className="flex items-end gap-3 md:col-span-3">
              <Button type="submit" loading={isSubmitting}>
                {editing ? t("admin.trips.saveChanges") : t("admin.trips.createTrip")}
              </Button>
              <Button variant="ghost" onClick={cancelForm} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="relative mb-6 rounded-2xl border border-white/15 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-4 shadow-card sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        >
          <div className="absolute -right-12 -top-20 h-52 w-52 rounded-full bg-orange-400/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-brand-300/30 blur-3xl" />
          <div className="absolute inset-0 bg-hero-grid opacity-[0.15]" />
        </div>
        <div className="relative">
          <div className="mb-3 flex items-center gap-2 text-white/85">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">{t("admin.trips.filters")}</span>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/80">
                {t("admin.trips.route")}
              </span>
              <GlassSelect
                value={routeFilter}
                onChange={(v) => patch({ route: v, page: "" })}
                options={routeOptions}
                placeholder={t("admin.trips.allRoutes")}
                ariaLabel={t("admin.trips.filterRouteAria")}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/80">
                {t("admin.bookings.status")}
              </span>
              <GlassSelect
                value={statusFilter}
                onChange={(v) => patch({ status: v, page: "" })}
                options={statusOptions}
                placeholder={t("admin.trips.allStatuses")}
                ariaLabel={t("admin.trips.filterStatusAria")}
              />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/80">
                {t("admin.trips.departureDate")}
              </span>
              <GlassDatePicker
                value={dateFilter}
                onChange={(v) => patch({ date: v, page: "" })}
                placeholder={t("admin.trips.anyDate")}
                ariaLabel={t("admin.trips.filterDateAria")}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => patch({ route: "", status: "", date: "", page: "" })}
                disabled={!hasFilters}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <X className="h-4 w-4" />
                {t("admin.trips.clearFilters")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title={t("admin.trips.emptyTitle")}
          description={
            hasFilters
              ? t("admin.trips.emptyFiltered")
              : t("admin.trips.emptyCreate")
          }
        />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {items.map((trip) => (
              <Card key={trip.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-base font-bold text-navy-900">
                    {cityLabel(trip.origin_city?.name)} <span className="text-navy-400">→</span>{" "}
                    {cityLabel(trip.destination_city?.name)}
                  </p>
                  <Badge label={statusText(trip.status)} />
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-navy-500">{t("admin.trips.departure")}</dt>
                    <dd className="text-right font-medium text-navy-800">{fmtDate(trip.departure_at)} {fmtClock(trip.departure_at)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-navy-500">{t("admin.trips.bus")}</dt>
                    <dd className="break-all text-right font-medium text-navy-800">{trip.bus?.name ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-navy-500">{t("admin.trips.operator")}</dt>
                    <dd className="break-all text-right font-medium text-navy-800">{trip.operator?.company_name ?? "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-navy-500">{t("admin.trips.price")}</dt>
                    <dd className="font-medium text-navy-800">{fmtMoney(trip.base_price)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-navy-500">{t("admin.trips.occupancy")}</dt>
                    <dd>
                      <OccupancyBar sold={trip.total_seats - trip.available_seats} total={trip.total_seats} />
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(trip)}
                    title={t("common.edit")}
                    aria-label={t("admin.trips.editTripAria")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {NEXT_STATUS[trip.status] && (
                    <button
                      type="button"
                      onClick={() => changeStatus.mutate({ id: trip.id, status: NEXT_STATUS[trip.status]! })}
                      title={t("admin.trips.markAs", { status: statusText(NEXT_STATUS[trip.status]!) })}
                      aria-label={t("admin.trips.markAs", { status: statusText(NEXT_STATUS[trip.status]!) })}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                    >
                      <Play className="h-4 w-4" />
                      {statusText(NEXT_STATUS[trip.status]!)}
                    </button>
                  )}
                  {trip.status !== "CANCELLED" && trip.status !== "COMPLETED" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t("admin.trips.cancelConfirm"))) {
                          changeStatus.mutate({ id: trip.id, status: "CANCELLED" });
                        }
                      }}
                      title={t("admin.trips.cancelTripTitle")}
                      aria-label={t("admin.trips.cancelTripTitle")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                  <Link
                    to={`/operator/trips/${trip.id}/manifest`}
                    title={t("admin.trips.viewManifest")}
                    aria-label={t("admin.trips.viewManifest")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <ClipboardList className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden p-0 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <th className="px-5 py-3">{t("admin.trips.route")}</th>
                    <th className="px-5 py-3">{t("admin.trips.departure")}</th>
                    <th className="px-5 py-3">{t("admin.trips.arrival")}</th>
                    <th className="px-5 py-3">{t("admin.routes.duration")}</th>
                    <th className="px-5 py-3">{t("admin.trips.operator")}</th>
                    <th className="px-5 py-3">{t("admin.trips.bus")}</th>
                    <th className="px-5 py-3">{t("admin.trips.price")}</th>
                    <th className="px-5 py-3">{t("admin.trips.occupancy")}</th>
                    <th className="px-5 py-3">{t("admin.bookings.status")}</th>
                    <th className="px-5 py-3 text-right">{t("admin.routes.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((trip) => (
                    <tr key={trip.id} className="border-b border-navy-50">
                      <td className="px-5 py-2.5 font-semibold text-navy-900">
                        {cityLabel(trip.origin_city?.name)} → {cityLabel(trip.destination_city?.name)}
                      </td>
                      <td className="px-5 py-2.5 text-navy-500">
                        <span className="font-medium text-navy-700">{fmtClock(trip.departure_at)}</span>
                        <span className="block text-xs text-navy-400">{fmtDate(trip.departure_at)}</span>
                      </td>
                      <td className="px-5 py-2.5 text-navy-500">{fmtClock(trip.arrival_at)}</td>
                      <td className="px-5 py-2.5 text-navy-500">{durationText(trip.duration_minutes)}</td>
                      <td className="px-5 py-2.5 text-navy-500">{trip.operator?.company_name ?? "—"}</td>
                      <td className="px-5 py-2.5 text-navy-500">
                        {trip.bus?.name ?? "—"}
                        <span className="block text-xs text-navy-400">{trip.bus?.registration_number ?? ""}</span>
                      </td>
                      <td className="px-5 py-2.5 font-medium text-navy-800">{fmtMoney(trip.base_price)}</td>
                      <td className="px-5 py-2.5">
                        <OccupancyBar sold={trip.total_seats - trip.available_seats} total={trip.total_seats} />
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge label={statusText(trip.status)} />
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(trip)}
                            title={t("common.edit")}
                            aria-label={t("admin.trips.editTripAria")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {NEXT_STATUS[trip.status] && (
                            <button
                              type="button"
                              onClick={() => changeStatus.mutate({ id: trip.id, status: NEXT_STATUS[trip.status]! })}
                              title={t("admin.trips.markAs", { status: statusText(NEXT_STATUS[trip.status]!) })}
                              aria-label={t("admin.trips.markAs", { status: statusText(NEXT_STATUS[trip.status]!) })}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 transition hover:bg-brand-50"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {trip.status !== "CANCELLED" && trip.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(t("admin.trips.cancelConfirm"))) {
                                  changeStatus.mutate({ id: trip.id, status: "CANCELLED" });
                                }
                              }}
                              title={t("admin.trips.cancelTripTitle")}
                              aria-label={t("admin.trips.cancelTripTitle")}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            to={`/operator/trips/${trip.id}/manifest`}
                            title={t("admin.trips.viewManifest")}
                            aria-label={t("admin.trips.viewManifest")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-navy-100 px-5 py-4 sm:flex-row">
              <p className="text-sm text-navy-500">
                {t("admin.trips.pageInfo", { count: total, page, totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={String(size)}
                  onChange={(e) => patch({ size: e.target.value, page: "" })}
                  className="w-28"
                  aria-label={t("admin.trips.rowsPerPageAria")}
                >
                  <option value="20">{t("admin.trips.rowsPerPage", { count: 20 })}</option>
                  <option value="50">{t("admin.trips.rowsPerPage", { count: 50 })}</option>
                  <option value="100">{t("admin.trips.rowsPerPage", { count: 100 })}</option>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => patch({ page: String(page - 1) })}
                >
                  {t("admin.trips.prev")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => patch({ page: String(page + 1) })}
                >
                  {t("admin.trips.next")}
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      <button
        type="button"
        onClick={() => (open && !editing ? cancelForm() : setOpen(true))}
        aria-label={open ? t("admin.trips.closeFormAria") : t("admin.trips.newTrip")}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-glow transition active:scale-95 sm:hidden"
      >
        {open ? <span className="text-2xl font-bold">✕</span> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
