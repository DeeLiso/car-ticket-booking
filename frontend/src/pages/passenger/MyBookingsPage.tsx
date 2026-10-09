import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/Badge";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { bookingsApi, ticketsApi } from "@/services/endpoints";
import { fmtDateTime, fmtMoney, fmtClock, fmtDate } from "@/utils/format";
import type { BookingOut, TicketOut } from "@/types";

export function MyBookingsPage({ tickets = false }: { tickets?: boolean }) {
  const [page, setPage] = useState(1);

  const bookings = useQuery({
    queryKey: ["my-bookings", page],
    queryFn: () => bookingsApi.mine(page, 10),
    enabled: !tickets,
  });

  if (tickets) return <TicketListPage />;

  if (bookings.isLoading) return <PageLoader />;
  if (bookings.error) return <InlineError message={(bookings.error as Error).message} onRetry={() => bookings.refetch()} />;

  const data = bookings.data!;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="My bookings" subtitle="Track, pay, and manage every trip you’ve reserved." />
      {data.items.length === 0 && (
        <EmptyState
          icon="🎫"
          title="No bookings yet"
          description="Search a route and reserve your first seat — it only takes a minute."
          action={
            <Link to="/search">
              <Button>Find trips</Button>
            </Link>
          }
        />
      )}
      <div className="space-y-4">
        {data.items.map((b) => (
          <BookingRow key={b.id} booking={b} />
        ))}
      </div>
      {data.pages > 1 && (
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Newer
          </Button>
          <span className="self-center text-sm text-navy-400">Page {page} of {data.pages}</span>
          <Button variant="ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Older →
          </Button>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingOut }) {
  return (
    <Link to={`/account/bookings/${booking.id}`}>
      <Card className="group grid gap-4 p-5 transition hover:shadow-pop sm:grid-cols-[1fr_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={booking.status} />
            <span className="font-display font-bold text-navy-900">
              {booking.trip?.origin} → {booking.trip?.destination}
            </span>
          </div>
          <p className="mt-1 text-sm text-navy-500">
            {booking.trip ? `${fmtDate(booking.trip.departure_at)} · ${fmtClock(booking.trip.departure_at)} · ${booking.trip.operator}` : `Ref ${booking.reference}`}
          </p>
          <p className="mt-2 flex flex-wrap gap-3 text-xs text-navy-400">
            <span>Ref {booking.reference}</span>
            <span>{booking.seat_count} seat{booking.seat_count === 1 ? "" : "s"}</span>
            {booking.has_ticket && booking.ticket_id && <Link to={`/account/tickets/${booking.ticket_id}`} className="font-semibold text-brand-700 hover:underline">View ticket →</Link>}
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

function TicketListPage() {
  const [ref, setRef] = useState("");
  const [ticket, setTicket] = useState<TicketOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!ref.trim()) return;
    setLoading(true);
    setError("");
    try {
      const t = await ticketsApi.lookup({ ticket_number: ref.trim() });
      setTicket(t);
    } catch (err) {
      setError((err as Error).message);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="My tickets" subtitle="Look up any issued digital ticket by its ticket number." />
      <Card className="mb-6 p-5">
        <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Ticket number, e.g. TK-2026-000123"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
          <Button type="submit" loading={loading}>Look up</Button>
        </form>
        {error && (
          <div className="mt-3">
            <InlineError message={error} />
          </div>
        )}
        {ticket && (
          <div className="mt-5">
            <Link to={`/account/tickets/${ticket.id}`}>
              <Button variant="ghost">Open ticket {ticket.ticket_number} →</Button>
            </Link>
          </div>
        )}
      </Card>
      <p className="text-sm text-navy-400">
        Tip: you can also open any ticket directly from the Confirmed booking page.
      </p>
    </div>
  );
}