import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/common/Badge";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { bookingsApi } from "@/services/endpoints";
import { apiTime, fmtDateTime, fmtMoney, fmtClock, fmtDate } from "@/utils/format";
import type { BookingOut } from "@/types";

type Tab = "upcoming" | "past" | "cancelled" | "all";

const ACTIVE = new Set(["CONFIRMED", "PENDING"]);
const TERMINATED = new Set(["CANCELLED", "EXPIRED", "REFUNDED", "REFUND_PENDING"]);

export function MyBookingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");

  const bookings = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => bookingsApi.mine(1, 50),
  });

  const items = bookings.data?.items ?? [];
  const now = new Date().getTime();

  const isUpcoming = (b: BookingOut) => ACTIVE.has(b.status) && apiTime(b.trip?.departure_at) >= now;
  const isPast = (b: BookingOut) => ACTIVE.has(b.status) && apiTime(b.trip?.departure_at) < now;

  const counts = useMemo(
    () => ({
      upcoming: items.filter(isUpcoming).length,
      past: items.filter(isPast).length,
      cancelled: items.filter((b) => TERMINATED.has(b.status)).length,
      all: items.length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((b) => {
      if (tab === "upcoming" && !isUpcoming(b)) return false;
      if (tab === "past" && !isPast(b)) return false;
      if (tab === "cancelled" && !TERMINATED.has(b.status)) return false;
      if (!q) return true;
      return [b.reference, b.trip?.origin, b.trip?.destination, b.contact_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tab, query]);

  if (bookings.isLoading)
    return (
      <SkeletonPage label={t("bookings.loading")}>
        <ListSkeleton rows={4} />
      </SkeletonPage>
    );
  if (bookings.error)
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10">
        <InlineError message={(bookings.error as Error).message} onRetry={() => bookings.refetch()} />
      </div>
    );

  const total = bookings.data!.total;
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: t("bookings.tabs.upcoming"), count: counts.upcoming },
    { key: "past", label: t("bookings.tabs.past"), count: counts.past },
    { key: "cancelled", label: t("bookings.tabs.cancelled"), count: counts.cancelled },
    { key: "all", label: t("bookings.tabs.all"), count: counts.all },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("bookings.title")} subtitle={t("bookings.subtitle")} />

      {items.length === 0 ? (
        <EmptyState
          icon="🎫"
          title={t("bookings.empty.title")}
          description={t("bookings.empty.description")}
          action={
            <Link to="/search">
              <Button>{t("bookings.empty.action")}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex flex-wrap rounded-2xl border border-navy-100 bg-white p-1 shadow-card">
              {tabs.map((tb) => (
                <button
                  key={tb.key}
                  type="button"
                  onClick={() => setTab(tb.key)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    tab === tb.key ? "bg-brand-600 text-white shadow-glow" : "text-navy-500 hover:text-navy-800"
                  }`}
                >
                  {tb.label}
                  <span className={`ml-1.5 text-xs ${tab === tb.key ? "text-white/70" : "text-navy-400"}`}>{tb.count}</span>
                </button>
              ))}
            </div>
            <input
              className="input sm:max-w-xs"
              placeholder={t("bookings.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="🔍"
              title={query ? t("bookings.empty.noMatchTitle") : t("bookings.empty.noTabTitle", { tab: t(`bookings.tabs.${tab}`) })}
              description={query ? t("bookings.empty.noMatchDescription") : t("bookings.empty.noTabDescription")}
            />
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}

          {total > items.length && (
            <p className="mt-6 text-center text-sm text-navy-400">
              {t("bookings.showing", { shown: items.length, total })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingOut }) {
  const { t } = useTranslation();
  return (
    <Link to={`/account/bookings/${booking.id}`}>
      <Card className="group grid gap-4 p-5 transition hover:shadow-pop sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={t(`checkoutStatus.${booking.status}`, booking.status)} />
            <span className="font-display font-bold text-navy-900">
              {booking.trip?.origin} → {booking.trip?.destination}
            </span>
          </div>
          <p className="mt-1 text-sm text-navy-500">
            {booking.trip
              ? `${fmtDate(booking.trip.departure_at)} · ${fmtClock(booking.trip.departure_at)} · ${booking.trip.operator}`
              : t("bookings.row.ref", { ref: booking.reference })}
          </p>
          <p className="mt-2 flex flex-wrap gap-3 text-xs text-navy-400">
            <span>{t("bookings.row.ref", { ref: booking.reference })}</span>
            <span>{t("bookings.row.seats", { count: booking.seat_count })}</span>
            {booking.has_ticket && booking.ticket_id && (
              <Link
                to={`/account/tickets/${booking.ticket_id}`}
                className="font-semibold text-brand-700 hover:underline"
              >
                {t("bookings.row.viewTicket")}
              </Link>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-extrabold text-brand-800">{fmtMoney(booking.total_amount)}</p>
          <p className="text-xs text-navy-400">{fmtDateTime(booking.created_at)}</p>
        </div>
      </Card>
    </Link>
  );
}
