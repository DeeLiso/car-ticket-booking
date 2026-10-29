import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BellRing, CircleCheck, Search, Ticket, Trash2, Wallet, X } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Input, Select } from "@/components/common/Field";
import { useBookingAlerts } from "@/hooks/useBookingAlerts";
import { apiTime, fmtDateTime, fmtMoney, initials } from "@/utils/format";
import type { BookingOut, BookingSeatOut, BookingStatusValue } from "@/types";

const DISMISSED_KEY = "tmax.adminBookingsDismissed";

const BOOKING_STATUSES: BookingStatusValue[] = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
];

type StatusFilter = "all" | BookingStatusValue;

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* storage unavailable - ignore */
  }
}

function NewPill() {
  const { t } = useTranslation();
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      {t("admin.bookings.new")}
    </span>
  );
}

function SelectBox({
  checked,
  onChange,
  label,
  indeterminate = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  indeterminate?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 shrink-0 cursor-pointer rounded border-navy-300 text-brand-600 accent-brand-600"
    />
  );
}

const TILE_TONES = {
  navy: "bg-navy-50 text-navy-600",
  red: "bg-red-50 text-red-600",
  emerald: "bg-emerald-50 text-emerald-600",
  brand: "bg-brand-50 text-brand-700",
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

function SeatChips({ seats, max = 3 }: { seats: BookingSeatOut[]; max?: number }) {
  if (seats.length === 0) return <span className="text-navy-400">—</span>;
  const shown = seats.slice(0, max);
  const rest = seats.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((seat) => (
        <span
          key={`${seat.seat_id}-${seat.seat_number}`}
          className="rounded-md border border-navy-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-navy-700"
        >
          {seat.seat_number}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-md bg-navy-100 px-1.5 py-0.5 text-[11px] font-semibold text-navy-600">
          +{rest}
        </span>
      )}
    </span>
  );
}

function PassengerCell({ booking }: { booking: BookingOut }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white ring-2 ring-white/60"
      >
        {initials(booking.contact_name || "?")}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-navy-800">{booking.contact_name}</p>
        <p className="truncate text-xs text-navy-400">{booking.contact_phone}</p>
      </div>
    </div>
  );
}

export function AdminBookingsPage() {
  const { t } = useTranslation();
  const { items, newCount, seenMs, isLoading, isError, refetch, markSeen, alarmEnabled, toggleAlarm } =
    useBookingAlerts({ sound: false });

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set(readDismissed()));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const visible = useMemo(() => items.filter((b) => !dismissed.has(b.id)), [items, dismissed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visible.filter((b) => {
      const matchQuery =
        q === "" ||
        [b.reference, b.contact_name, b.contact_phone, b.contact_email ?? ""].some((field) =>
          field.toLowerCase().includes(q),
        );
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [visible, search, statusFilter]);

  const stats = useMemo(() => {
    const confirmed = visible.filter((b) => b.status === "CONFIRMED");
    return {
      total: visible.length,
      confirmed: confirmed.length,
      revenue: confirmed.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0),
    };
  }, [visible]);

  const isNew = (b: BookingOut) => apiTime(b.created_at) > seenMs;
  const hasFilters = search.trim() !== "" || statusFilter !== "all";

  const routeLabel = (b: BookingOut) =>
    b.trip
      ? `${t(`admin.cities.${b.trip.origin}`, { defaultValue: b.trip.origin })} → ${t(
          `admin.cities.${b.trip.destination}`,
          { defaultValue: b.trip.destination },
        )}`
      : "—";

  const allSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  const someSelected = filtered.some((b) => selected.has(b.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((b) => b.id)));
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  function dismiss(ids: string[]) {
    if (ids.length === 0) return;
    setDismissed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      writeDismissed(next);
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  function dismissSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(t("admin.bookings.confirmDismiss", { count: ids.length }))) return;
    dismiss(ids);
  }

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={t("admin.bookings.title")}
        subtitle={t("admin.bookings.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <Button variant="danger" size="sm" onClick={dismissSelected}>
                <Trash2 className="h-4 w-4" />
                {t("admin.bookings.deleteCount", { count: selected.size })}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAlarm}
              aria-pressed={alarmEnabled}
              title={alarmEnabled ? t("admin.bookings.alarmOnTitle") : t("admin.bookings.alarmOffTitle")}
            >
              {alarmEnabled ? t("admin.bookings.alarmOn") : t("admin.bookings.alarmOff")}
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={t("admin.bookings.statsTotal")}
          value={String(stats.total)}
          tone="navy"
          icon={<Ticket className="h-4 w-4" />}
        />
        <StatTile
          label={t("admin.bookings.statsNew")}
          value={String(newCount)}
          tone="red"
          icon={<BellRing className="h-4 w-4" />}
        />
        <StatTile
          label={t("admin.bookings.statsConfirmed")}
          value={String(stats.confirmed)}
          tone="emerald"
          icon={<CircleCheck className="h-4 w-4" />}
        />
        <StatTile
          label={t("admin.bookings.statsRevenue")}
          value={fmtMoney(stats.revenue)}
          tone="brand"
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-red-700 dark:text-red-200">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm">
              <Trash2 className="h-3.5 w-3.5" />
            </span>
            {t("admin.bookings.alertsSelected", { count: selected.size })}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t("admin.bookings.clear")}
            </Button>
            <Button size="sm" variant="danger" onClick={dismissSelected}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              {t("admin.bookings.deleteSelected")}
            </Button>
          </div>
        </div>
      )}

      {isError && (
        <div className="mb-5">
          <InlineError message={t("admin.bookings.loadError")} onRetry={refetch} />
        </div>
      )}

      {newCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/10">
          <p className="flex items-center gap-2.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
              <BellRing className="h-3.5 w-3.5" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-400" />
            </span>
            {t("admin.bookings.newBookings", { count: newCount })}
          </p>
          <Button size="sm" variant="ghost" onClick={markSeen}>
            {t("admin.bookings.markSeen")}
          </Button>
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.bookings.searchPlaceholder")}
            aria-label={t("admin.bookings.searchAria")}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label={t("admin.bookings.filterAria")}
            className="w-full sm:w-52"
          >
            <option value="all">{t("admin.bookings.allStatuses")}</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`admin.status.${status}`, { defaultValue: status })}
              </option>
            ))}
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="shrink-0 whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5" />
              {t("admin.bookings.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      {!isLoading && visible.length > 0 && (
        <p className="mb-3 text-xs font-medium text-navy-500">
          {t("admin.bookings.showing", { shown: filtered.length, total: visible.length })}
        </p>
      )}

      {isLoading ? (
        <SkeletonPage label={t("admin.bookings.loading")}>
          <TableSkeleton columns={8} rows={5} />
        </SkeletonPage>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="📭"
          title={t("admin.bookings.emptyTitle")}
          description={t("admin.bookings.emptyDesc")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={t("admin.bookings.noMatchTitle")}
          description={t("admin.bookings.noMatchDesc")}
          action={
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              {t("admin.bookings.clearFilters")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {filtered.map((b) => {
              const selectedRow = selected.has(b.id);
              const fresh = isNew(b);
              return (
                <Card
                  key={b.id}
                  className={`overflow-hidden p-0 ${
                    selectedRow ? "ring-2 ring-brand-400" : fresh ? "ring-2 ring-red-300" : ""
                  }`}
                >
                  <div
                    className={`flex items-center justify-between gap-2 border-b px-4 py-3 ${
                      fresh
                        ? "border-red-100 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/10"
                        : "border-navy-50 bg-navy-50/50"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <SelectBox
                        checked={selectedRow}
                        onChange={() => toggleOne(b.id)}
                        label={t("admin.bookings.selectAria", { reference: b.reference })}
                      />
                      <p className="truncate font-mono text-xs font-bold text-navy-900">
                        {b.reference}
                      </p>
                      {fresh && <NewPill />}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge label={t(`admin.status.${b.status}`, { defaultValue: b.status })} />
                      <button
                        type="button"
                        onClick={() => dismiss([b.id])}
                        aria-label={t("admin.bookings.deleteAria", { reference: b.reference })}
                        title={t("admin.bookings.deleteThisAlert")}
                        className="rounded-full p-1.5 text-navy-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <p className="font-display text-base font-bold text-navy-900">{routeLabel(b)}</p>
                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <PassengerCell booking={b} />
                      <span className="shrink-0 font-display text-base font-extrabold tabular-nums text-navy-900">
                        {fmtMoney(b.total_amount)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-navy-50 pt-2.5">
                      <div className="min-w-0">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                          {t("admin.bookings.seats")}
                        </p>
                        <SeatChips seats={b.seats} />
                      </div>
                      <div className="text-right">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                          {t("admin.bookings.received")}
                        </p>
                        <p className="text-xs font-medium text-navy-600">{fmtDateTime(b.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="hidden overflow-hidden p-0 sm:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-navy-100 bg-navy-50/80 text-left text-[11px] uppercase tracking-[0.08em] text-navy-500">
                    <th className="w-10 px-4 py-3">
                      <SelectBox
                        checked={allSelected}
                        indeterminate={!allSelected && someSelected}
                        onChange={toggleAll}
                        label={t("admin.bookings.selectAllAria")}
                      />
                    </th>
                    <th className="px-4 py-3">{t("admin.bookings.reference")}</th>
                    <th className="px-4 py-3">{t("admin.bookings.passenger")}</th>
                    <th className="px-4 py-3">{t("admin.bookings.route")}</th>
                    <th className="px-4 py-3">{t("admin.bookings.seats")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.bookings.amount")}</th>
                    <th className="px-4 py-3">{t("admin.bookings.status")}</th>
                    <th className="px-4 py-3">{t("admin.bookings.received")}</th>
                    <th className="w-12 px-4 py-3">
                      <span className="sr-only">{t("admin.bookings.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {filtered.map((b) => {
                    const selectedRow = selected.has(b.id);
                    const fresh = isNew(b);
                    return (
                      <tr
                        key={b.id}
                        className={`group transition-colors ${
                          selectedRow
                            ? "bg-brand-50/60"
                            : fresh
                              ? "bg-red-50/40 hover:bg-red-50/70"
                              : "hover:bg-navy-50/60"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <SelectBox
                            checked={selectedRow}
                            onChange={() => toggleOne(b.id)}
                            label={t("admin.bookings.selectAria", { reference: b.reference })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <span className="rounded-md bg-navy-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-navy-800 ring-1 ring-inset ring-navy-100">
                              {b.reference}
                            </span>
                            {fresh && <NewPill />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PassengerCell booking={b} />
                        </td>
                        <td className="px-4 py-3 font-medium text-navy-700">{routeLabel(b)}</td>
                        <td className="px-4 py-3">
                          <SeatChips seats={b.seats} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy-900">
                          {fmtMoney(b.total_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={t(`admin.status.${b.status}`, { defaultValue: b.status })} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-navy-500">
                          {fmtDateTime(b.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => dismiss([b.id])}
                            aria-label={t("admin.bookings.deleteAria", { reference: b.reference })}
                            title={t("admin.bookings.deleteThisAlert")}
                            className="rounded-full p-1.5 text-navy-400 opacity-60 transition hover:bg-red-50 hover:text-red-600 hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
    </div>
  );
}
