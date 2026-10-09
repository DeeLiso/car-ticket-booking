import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Field";
import { SeatMap } from "@/components/seats/SeatMap";
import { bookingsApi, tripsApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { fmtMoney } from "@/utils/format";
import type { SeatStatus } from "@/types";

interface PaxForm {
  full_name: string;
  phone: string;
}

export function CheckoutPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const paxCount = Math.max(1, Math.min(10, Number(searchParams.get("passengers") ?? 1)));
  const preset = useMemo(() => {
    const raw = searchParams.get("seats") ?? "";
    return new Set(raw.split(",").filter(Boolean));
  }, [searchParams]);

  const seatsQ = useQuery({ queryKey: ["trip-seats", tripId], queryFn: () => tripsApi.seats(tripId!), enabled: !!tripId });
  const [selected, setSelected] = useState<Set<string>>(preset);
  const [forms, setForms] = useState<Record<string, PaxForm>>({});
  const [contact, setContact] = useState({ name: user?.full_name ?? "", phone: user?.phone ?? "" });
  const [error, setError] = useState("");

  const selectedSeats = (seatsQ.data?.seats ?? []).filter((s) => selected.has(s.seat_id));
  const total = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  function toggle(seat: SeatStatus) {
    setError("");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.seat_id)) next.delete(seat.seat_id);
      else if (next.size < paxCount) next.add(seat.seat_id);
      return next;
    });
  }

  const create = useMutation({
    mutationFn: () =>
      bookingsApi.create({
        trip_id: tripId!,
        seat_ids: selectedSeats.map((s) => s.seat_id),
        passengers: selectedSeats.map((s) => ({
          seat_id: s.seat_id,
          full_name: forms[s.seat_id]?.full_name || user?.full_name || "",
          phone: forms[s.seat_id]?.phone || user?.phone || "",
        })),
        contact_name: contact.name,
        contact_phone: contact.phone,
      }),
    onSuccess: (booking) => navigate(`/account/bookings/${booking.id}`, { replace: true }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  if (seatsQ.isLoading) return <PageLoader label="Preparing seat map…" />;
  if (seatsQ.error)
    return (
      <div className="container-app py-10">
        <InlineError message={(seatsQ.error as Error).message} onRetry={() => seatsQ.refetch()} />
      </div>
    );

  const map = seatsQ.data!;
  const canSubmit = selectedSeats.length > 0 && contact.name.trim().length >= 2 && contact.phone.trim().length >= 6;

  return (
    <div id="main" tabIndex={-1} className="min-h-screen outline-none">
      <PublicHeader />
      <section className="border-b border-navy-100 bg-white">
        <div className="container-app py-6">
          <h1 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">Book your trip</h1>
          <p className="mt-1 text-sm text-navy-500">
            Select {paxCount} {paxCount === 1 ? "seat" : "seats"} — {map.available_seats} available · {fmtMoney(map.base_price)}/seat from
          </p>
        </div>
      </section>

      <div className="container-app grid gap-6 py-8 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-navy-900">1 · Pick your seats</h2>
          <SeatMap map={map} selected={selected} maxSelect={paxCount} onToggle={toggle} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-navy-900">2 · Passenger details</h2>
            {selectedSeats.length === 0 && (
              <p className="text-sm text-navy-400">Select a seat to add its passenger.</p>
            )}
            <div className="space-y-4">
              {selectedSeats.map((s) => (
                <div key={s.seat_id} className="rounded-xl bg-navy-50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-500">
                    Seat {s.seat_number} · {fmtMoney(s.price)}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Full name">
                      <Input
                        value={forms[s.seat_id]?.full_name ?? ""}
                        placeholder={user?.full_name ?? "Passenger name"}
                        onChange={(e) => setForms({ ...forms, [s.seat_id]: { ...forms[s.seat_id], full_name: e.target.value } })}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={forms[s.seat_id]?.phone ?? ""}
                        placeholder={user?.phone ?? "09 XXX"}
                        onChange={(e) => setForms({ ...forms, [s.seat_id]: { ...forms[s.seat_id], phone: e.target.value } })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-navy-900">3 · Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact name">
                <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </Field>
              <Field label="Contact phone">
                <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-navy-600">
                <span>Seats ({selectedSeats.length})</span>
                <span>{fmtMoney(total)}</span>
              </div>
              <div className="flex justify-between text-navy-600">
                <span>Booking fee</span>
                <span>Included</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-navy-100 pt-2">
                <span className="font-display font-bold text-navy-900">Total</span>
                <span className="font-display text-lg font-extrabold text-brand-800">{fmtMoney(total)}</span>
              </div>
            </div>
            {error && (
              <div className="mt-3">
                <InlineError message={error} />
              </div>
            )}
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!canSubmit}
              loading={create.isPending}
              onClick={() => {
                setError("");
                create.mutate();
              }}
            >
              Continue to payment →
            </Button>
            <p className="mt-2 text-center text-xs text-navy-400">
              Booking holds your seats for 10 minutes; no charge until payment.
            </p>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}