import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card, EmptyState } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton } from "@/components/common/Skeleton";
import { MonthlyGrid } from "@/components/calendar/MonthlyGrid";
import { useIsAuthenticated } from "@/store/auth";
import { bookingsApi } from "@/services/endpoints";
import { fmtClock, fmtMoney } from "@/utils/format";
import {
  addMonths,
  formatLongDate,
  isToday,
  startOfDay,
  startOfMonth,
  toISODate,
  type WeekStart,
} from "@/utils/calendarUtils";
import type { BookingOut } from "@/types";

const WEEK_START: WeekStart = 1;

/** Dot colour for a day, based on the "strongest" booking status that day. */
function dayDotClass(dayBookings: BookingOut[] | undefined): string | undefined {
  if (!dayBookings || dayBookings.length === 0) return undefined;
  const statuses = new Set(dayBookings.map((b) => b.status));
  if (statuses.has("CONFIRMED")) return "bg-emerald-500";
  if (statuses.has("PENDING") || statuses.has("REFUND_PENDING")) return "bg-amber-500";
  if (statuses.has("REFUNDED")) return "bg-violet-500";
  return "bg-red-400";
}

export function BookingCalendarPage() {
  const { t } = useTranslation();
  const authed = useIsAuthenticated();
  const [monthOverride, setMonthOverride] = useState<Date | null>(null);
  const [dayOverride, setDayOverride] = useState<Date | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-bookings", "calendar"],
    queryFn: () => bookingsApi.mine(1, 50),
    enabled: authed,
  });

  const bookings = useMemo(() => data?.items ?? [], [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, BookingOut[]>();
    for (const booking of bookings) {
      const iso = booking.trip?.departure_at;
      if (!iso) continue;
      const key = toISODate(new Date(iso));
      const list = map.get(key);
      if (list) list.push(booking);
      else map.set(key, [booking]);
    }
    return map;
  }, [bookings]);

  const upcoming = useMemo(() => {
    const floor = startOfDay(new Date()).getTime();
    return bookings
      .flatMap((booking) => {
        const iso = booking.trip?.departure_at;
        if (!iso) return [];
        const date = new Date(iso);
        return date.getTime() >= floor ? [date] : [];
      })
      .sort((a, b) => a.getTime() - b.getTime());
  }, [bookings]);

  const month = monthOverride ?? startOfMonth(upcoming[0] ?? new Date());
  const selected = dayOverride ?? upcoming[0] ?? startOfDay(new Date());
  const dayBookings = byDay.get(toISODate(selected)) ?? [];
  const total = data?.total ?? bookings.length;

  function go(delta: number) {
    setMonthOverride(addMonths(month, delta));
  }

  function pick(date: Date) {
    setDayOverride(date);
    setMonthOverride(startOfMonth(date));
  }

  function goToday() {
    const today = new Date();
    setMonthOverride(startOfMonth(today));
    setDayOverride(startOfDay(today));
  }

  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />
      <PageHero className="-mt-16 pb-10 pt-24">
        <div className="container-app flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-orange-300">
              <CalendarDays className="h-4 w-4" /> {t("booking.kicker")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">
              {t("booking.title")}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-navy-200">
              {t("booking.subtitle")}
            </p>
          </div>
          <Link to="/search" className="btn-primary">
            <Plus className="h-4 w-4" /> {t("booking.bookCta")}
          </Link>
        </div>
      </PageHero>

      <main className="container-app py-8 lg:py-12">
        {!authed ? (
          <EmptyState
            icon="🗓️"
            title={t("booking.signInTitle")}
            description={t("booking.signInDesc")}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/login">
                  <Button>{t("booking.signIn")}</Button>
                </Link>
                <Link to="/search">
                  <Button variant="ghost">{t("booking.findTrips")}</Button>
                </Link>
              </div>
            }
          />
        ) : error ? (
          <InlineError message={(error as Error).message} onRetry={() => refetch()} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t("calendar.prevMonth")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-100 text-navy-600 transition hover:bg-navy-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="min-w-[9rem] text-center font-display text-lg font-bold text-navy-900">
                    {t(`calendar.months.${month.getMonth()}`)} {month.getFullYear()}
                  </p>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t("calendar.nextMonth")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-100 text-navy-600 transition hover:bg-navy-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Button variant="ghost" size="sm" onClick={goToday}>
                  {t("calendar.today")}
                </Button>
              </div>

              {isLoading ? (
                <div className="py-4">
                  <ListSkeleton rows={3} />
                </div>
              ) : (
                <MonthlyGrid
                  month={month}
                  weekStart={WEEK_START}
                  selected={selected}
                  onSelect={pick}
                  variant="light"
                  countEvents={(date) => byDay.get(toISODate(date))?.length ?? 0}
                  dotClassName={(date) => dayDotClass(byDay.get(toISODate(date)))}
                />
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-navy-100 pt-4 text-xs text-navy-500">
                <LegendDot className="bg-emerald-500" label={t("booking.legend.confirmed")} />
                <LegendDot className="bg-amber-500" label={t("booking.legend.pending")} />
                <LegendDot className="bg-violet-500" label={t("booking.legend.refunded")} />
                <LegendDot className="bg-red-400" label={t("booking.legend.cancelled")} />
              </div>
            </Card>

            <Card className="h-fit p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    {isToday(selected) ? t("calendar.today") : t("booking.selectedDay")}
                  </p>
                  <p className="font-display text-lg font-bold text-navy-900">{formatLongDate(selected)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {t("booking.tripCount", { count: dayBookings.length })}
                </span>
              </div>

              {isLoading ? (
                <ListSkeleton rows={2} />
              ) : dayBookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-navy-200 px-4 py-8 text-center">
                  <p className="text-sm text-navy-500">{t("booking.noTripsOnDay")}</p>
                  <Link to="/search" className="mt-3 inline-block">
                    <Button variant="ghost" size="sm">
                      {t("booking.findTrips")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {dayBookings.map((booking) => (
                    <li key={booking.id}>
                      <DayBookingCard booking={booking} />
                    </li>
                  ))}
                </ul>
              )}

              {authed && !isLoading && total > bookings.length && (
                <p className="mt-4 text-xs text-navy-400">
                  {t("booking.showingLatest", { shown: bookings.length, total })}{" "}
                  <Link to="/account" className="font-semibold text-brand-700 hover:underline">
                    {t("booking.myBookings")}
                  </Link>{" "}
                  {t("booking.forFullList")}
                </p>
              )}
            </Card>
          </div>
        )}
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}

function DayBookingCard({ booking }: { booking: BookingOut }) {
  const { t } = useTranslation();
  const trip = booking.trip;
  return (
    <Link to={`/account/bookings/${booking.id}`} className="block">
      <div className="rounded-xl border border-navy-100 bg-white p-3.5 transition hover:border-brand-200 hover:shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-display font-bold text-navy-900">
            {trip ? `${trip.origin} → ${trip.destination}` : t("booking.refLabel", { ref: booking.reference })}
          </p>
          <Badge label={t(`booking.status.${booking.status.toLowerCase()}`, { defaultValue: booking.status })} />
        </div>
        {trip && (
          <p className="mt-1 text-sm text-navy-500">
            {fmtClock(trip.departure_at)} · {trip.operator}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-navy-400">
          <span className="truncate">
            {t("booking.refLabel", { ref: booking.reference })} · {t("booking.seatsCount", { count: booking.seat_count })}
          </span>
          <span className="shrink-0 font-display text-sm font-extrabold text-brand-800">
            {fmtMoney(booking.total_amount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}
