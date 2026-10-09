import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader, Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { bookingsApi, paymentsApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { fmtDateTime, fmtMoney, titleCase } from "@/utils/format";

const METHODS = [
  { id: "MOCK", name: "Demo instant pay", icon: "🧪", desc: "Simulates a successful mobile payment instantly." },
  { id: "KBZPAY", name: "KBZ Pay", icon: "💜", desc: "Pay with your KBZ Pay wallet." },
  { id: "WAVEPAY", name: "Wave Pay", icon: "💙", desc: "Pay with your Wave Money." },
  { id: "CBPAY", name: "CB Pay", icon: "💳", desc: "One-tap cardless via CB Pay." },
  { id: "BANK_TRANSFER", name: "Bank transfer", icon: "🏦", desc: "Bank counter transfer, reviewed manually." },
];

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [payError, setPayError] = useState("");
  const [cancelMsg, setCancelMsg] = useState("");

  const bookingQ = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => bookingsApi.detail(bookingId!),
    enabled: !!bookingId,
    refetchInterval: 15000,
  });

  const pay = useMutation({
    mutationFn: async (method: string) => {
      const init = await paymentsApi.initiate(bookingId!, method);
      if (method === "MOCK" && init.mock_confirm_token) {
        await paymentsApi.mockConfirm(init.payment.transaction_ref, init.mock_confirm_token, true);
      }
      return init;
    },
    onSuccess: () => {
      setPayError("");
      bookingQ.refetch();
    },
    onError: (err) => setPayError(apiErrorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(bookingId!, window.prompt("Reason (optional)") ?? undefined),
    onSuccess: (b) => {
      setCancelMsg(`Booking ${b.reference} cancelled.`);
      bookingQ.refetch();
    },
    onError: (err) => setPayError(apiErrorMessage(err)),
  });

  if (bookingQ.isLoading) return <PageLoader />;
  if (bookingQ.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(bookingQ.error as Error).message} onRetry={() => bookingQ.refetch()} />
      </div>
    );

  const b = bookingQ.data!;
  const pending = b.status === "PENDING";
  const cancellable = b.status === "PENDING" || b.status === "CONFIRMED";

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={`Booking ${b.reference}`}
        subtitle={`Placed ${fmtDateTime(b.created_at)}`}
        actions={<Badge label={b.status} />}
      />

      {cancelMsg && (
        <div className="mb-5">
          <Alert tone="success">{cancelMsg}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-display font-bold text-navy-900">Trip</h2>
            {b.trip ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-display text-xl font-extrabold text-brand-800">
                    {b.trip.origin} → {b.trip.destination}
                  </p>
                  <p className="mt-1 text-sm text-navy-500">{fmtDateTime(b.trip.departure_at)} — {fmtDateTime(b.trip.arrival_at)}</p>
                  <p className="mt-1 text-sm text-navy-500">{b.trip.operator} · {b.trip.bus_name} ({b.trip.bus_registration})</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-navy-400">Trip details unavailable.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display font-bold text-navy-900">Seats & passengers</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-500">
                    <th className="py-2 pr-4">Seat</th>
                    <th className="py-2 pr-4">Class</th>
                    <th className="py-2 pr-4">Passenger</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {b.seats.map((s) => {
                    const pax = b.passengers.find((p) => p.seat_number === s.seat_number);
                    return (
                      <tr key={s.seat_id} className="border-b border-navy-50">
                        <td className="py-2.5 pr-4 font-bold text-navy-900">{s.seat_number}</td>
                        <td className="py-2.5 pr-4 text-navy-500">{titleCase(s.category)}</td>
                        <td className="py-2.5 pr-4 text-navy-800">{pax?.full_name ?? "—"}</td>
                        <td className="py-2.5 pr-4 text-navy-500">{pax?.phone ?? "—"}</td>
                        <td className="py-2.5 text-right font-semibold">{fmtMoney(s.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-navy-600"><span>Subtotal</span><span>{fmtMoney(b.subtotal)}</span></div>
              <div className="flex justify-between text-navy-600"><span>Fees</span><span>{fmtMoney(b.fees)}</span></div>
              <div className="mt-2 flex justify-between border-t border-navy-100 pt-2">
                <span className="font-display font-bold text-navy-900">Total</span>
                <span className="font-display text-xl font-extrabold text-brand-800">{fmtMoney(b.total_amount)}</span>
              </div>
            </div>
            {b.expires_at && pending && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Seats held until {fmtDateTime(b.expires_at)}.
              </p>
            )}
          </Card>

          {pending && (
            <Card className="p-5">
              <h2 className="mb-3 font-display font-bold text-navy-900">Pay to confirm</h2>
              {payError && (
                <div className="mb-3">
                  <InlineError message={payError} />
                </div>
              )}
              <div className="space-y-2">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    className="flex w-full items-center gap-3 rounded-xl border border-navy-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pay.isPending}
                    onClick={() => pay.mutate(m.id)}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-navy-900">{m.name}</span>
                      <span className="block text-xs text-navy-500">{m.desc}</span>
                    </span>
                    {pay.isPending && <span className="text-xs text-navy-400">…</span>}
                  </button>
                ))}
              </div>
              {b.has_ticket && b.ticket_id && (
                <p className="mt-3 text-center text-xs text-navy-400">
                  <Link to={`/account/tickets/${b.ticket_id}`} className="font-semibold text-brand-700 hover:underline">
                    Ticket already issued — view it →
                  </Link>
                </p>
              )}
            </Card>
          )}

          {b.status === "CONFIRMED" && (
            <Card className="p-5 text-center">
              <p className="text-emerald-600">✓ Payment confirmed</p>
              {b.ticket_id && (
                <Button className="mt-3 w-full" variant="accent" onClick={() => window.open(`/account/tickets/${b.ticket_id}`, "_self")}>
                  View ticket
                </Button>
              )}
            </Card>
          )}

          {b.status === "REFUND_PENDING" && (
            <Alert tone="info">Refund requested. An operator will review and settle it shortly.</Alert>
          )}
          {b.status === "REFUNDED" && (
            <Alert tone="success">This booking was fully refunded. Happy travels!</Alert>
          )}

          {cancellable && (
            <Button
              variant="danger"
              className="w-full"
              loading={cancel.isPending}
              onClick={() => {
                setPayError("");
                cancel.mutate();
              }}
            >
              Cancel booking
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}