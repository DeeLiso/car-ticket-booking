import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Field";
import { SeatMap } from "@/components/seats/SeatMap";
import { bookingsApi, tripsApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { durationText, fmtClock, fmtDate, fmtMoney, titleCase } from "@/utils/format";
import type { SeatStatus } from "@/types";

interface PaxForm {
  full_name: string;
  phone: string;
  id_number: string;
}

export function CheckoutPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const initialPax = Math.max(1, Math.min(10, Number(searchParams.get("passengers") ?? 1)));
  const preset = useMemo(() => {
    const raw = searchParams.get("seats") ?? "";
    return new Set(raw.split(",").filter(Boolean));
  }, [searchParams]);

  const seatsQ = useQuery({ queryKey: ["trip-seats", tripId], queryFn: () => tripsApi.seats(tripId!), enabled: !!tripId });
  const tripQ = useQuery({ queryKey: ["trip", tripId], queryFn: () => tripsApi.detail(tripId!), enabled: !!tripId });

  const [step, setStep] = useState<1 | 2>(1);
  const [paxCount, setPaxCount] = useState(initialPax);
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

  function changePax(next: number) {
    const n = Math.max(1, Math.min(10, next));
    setPaxCount(n);
    setSelected((prev) => new Set([...prev].slice(0, n)));
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
          id_number: forms[s.seat_id]?.id_number || undefined,
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
  const trip = tripQ.data;
  const taker = selectedSeats.every((s) => (forms[s.seat_id]?.id_number ?? "").trim().length >= 6);
  const canSubmit = selectedSeats.length > 0 && contact.name.trim().length >= 2 && contact.phone.trim().length >= 6 && taker;
  const canAdvance = selectedSeats.length > 0;

  return (
    <div id="main" tabIndex={-1} className="min-h-screen outline-none">
      <PublicHeader transparent />

      <PageHero className="-mt-16 pb-8 pt-24">
        <div className="container-app">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">Book your trip</h1>
          <p className="mt-1 text-sm text-navy-200">
            {map.available_seats} seats available · {fmtMoney(map.base_price)}/seat from
          </p>
        </div>
      </PageHero>

      {/* Progress stepper */}
      <div className="border-b border-navy-100 bg-white">
        <div className="container-app py-4">
          <Stepper step={step} canAdvance={canAdvance} onGo={setStep} />
        </div>
      </div>

      <div className="container-app grid gap-4 py-6 sm:gap-6 sm:py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 sm:space-y-6">
          {step === 1 ? (
            <>
              <ItineraryCard trip={trip} loading={tripQ.isLoading} paxCount={paxCount} />

              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy-900">Passengers</h2>
                    <p className="text-sm text-navy-500">How many travellers are on this trip?</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-navy-200 p-1.5 sm:gap-3">
                    <button
                      type="button"
                      aria-label="Fewer passengers"
                      onClick={() => changePax(paxCount - 1)}
                      disabled={paxCount <= 1}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100 text-lg font-bold text-navy-700 transition hover:bg-navy-200 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="min-w-[4.75rem] text-center font-display font-bold text-navy-900 sm:min-w-[5.5rem]">
                      {paxCount} {paxCount === 1 ? "traveller" : "travellers"}
                    </span>
                    <button
                      type="button"
                      aria-label="More passengers"
                      onClick={() => changePax(paxCount + 1)}
                      disabled={paxCount >= 10}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-100 text-lg font-bold text-navy-700 transition hover:bg-navy-200 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                  <h2 className="font-display text-lg font-bold text-navy-900">Choose your seats</h2>
                  <span className="badge bg-orange-50 text-orange-700">
                    {selectedSeats.length} of {paxCount} selected
                  </span>
                </div>
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <SeatMap map={map} selected={selected} maxSelect={paxCount} onToggle={toggle} />
                </div>
              </Card>
            </>
          ) : (
            <>
              <Card className="p-4 sm:p-5">
                <h2 className="mb-4 font-display text-lg font-bold text-navy-900">Passenger details</h2>
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
                      <div className="mt-3">
                        <Field label="National ID (NRC)">
                          <Input
                            value={forms[s.seat_id]?.id_number ?? ""}
                            placeholder="e.g. 12/XXXX(N) 043210"
                            inputMode="text"
                            onChange={(e) => setForms({ ...forms, [s.seat_id]: { ...forms[s.seat_id], id_number: e.target.value } })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <h2 className="mb-4 font-display text-lg font-bold text-navy-900">Contact</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Contact name">
                    <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
                  </Field>
                  <Field label="Contact phone">
                    <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                  </Field>
                </div>
              </Card>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                ← Back to seat selection
              </button>
            </>
          )}
        </div>

        {/* Summary rail */}
        <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4 sm:p-5">
            <h2 className="font-display text-lg font-bold text-navy-900">Pricing summary</h2>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-navy-600">
                <span>Passengers</span>
                <span>{paxCount}</span>
              </div>
              <div className="flex justify-between text-navy-600">
                <span>Seats selected</span>
                <span>{selectedSeats.length}</span>
              </div>
              {selectedSeats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedSeats.map((s) => (
                    <span key={s.seat_id} className="badge bg-brand-50 text-brand-700">
                      {s.seat_number} · {fmtMoney(s.price)}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-navy-600">
                <span>Booking fee</span>
                <span>Included</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-navy-100 pt-3">
                <span className="font-display font-bold text-navy-900">Total</span>
                <span className="font-display text-xl font-extrabold text-orange-600">{fmtMoney(total)}</span>
              </div>
            </div>

            {error && (
              <div className="mt-3">
                <InlineError message={error} />
              </div>
            )}

            {step === 1 ? (
              <Button
                className="mt-4 w-full"
                size="lg"
                disabled={!canAdvance}
                onClick={() => setStep(2)}
              >
                Next step →
              </Button>
            ) : (
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
                Confirm &amp; pay →
              </Button>
            )}
            <p className="mt-2 text-center text-xs text-navy-400">
              Booking holds your seats for 10 minutes; no charge until payment.
            </p>
          </Card>

          <InfoCards />
        </aside>
      </div>
      <Footer />
    </div>
  );
}

function Stepper({
  step,
  canAdvance,
  onGo,
}: {
  step: 1 | 2;
  canAdvance: boolean;
  onGo: (s: 1 | 2) => void;
}) {
  const items: { n: 1 | 2; label: string; sub: string }[] = [
    { n: 1, label: "Travel details", sub: "Seats & passengers" },
    { n: 2, label: "Passenger & payment", sub: "Details & confirm" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-3 sm:gap-5">
      {items.map((it, i) => {
        const active = step === it.n;
        const done = step > it.n;
        const clickable = it.n === 1 || canAdvance;
        return (
          <li key={it.n} className="flex items-center gap-3 sm:gap-5">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onGo(it.n)}
              className={`flex items-center gap-3 text-left ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                  active
                    ? "bg-orange-500 text-white shadow-cta"
                    : done
                      ? "bg-brand-600 text-white"
                      : "border border-navy-200 bg-white text-navy-500"
                }`}
              >
                {done ? "✓" : it.n}
              </span>
              <span className="leading-tight">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-navy-400">
                  Step {it.n} of 2
                </span>
                <span className={`block text-sm font-bold ${active ? "text-navy-900" : "text-navy-500"}`}>
                  {it.label}
                </span>
              </span>
            </button>
            {i < items.length - 1 && <span className="h-px w-6 bg-navy-200 sm:w-12" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function ItineraryCard({
  trip,
  loading,
  paxCount,
}: {
  trip: import("@/types").TripSummary | undefined;
  loading: boolean;
  paxCount: number;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-navy-100 bg-navy-50/60 px-5 py-3">
        <h2 className="font-display text-lg font-bold text-navy-900">Itinerary</h2>
        <span className="badge bg-brand-50 text-brand-700">
          {paxCount} {paxCount === 1 ? "passenger" : "passengers"}
        </span>
      </div>
      {loading || !trip ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-navy-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-200 border-t-brand-600" />
          Loading trip details…
        </div>
      ) : (
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-navy-900">{fmtClock(trip.departure_at)}</p>
              <p className="text-xs text-navy-400">{trip.origin_city?.name}</p>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <span className="text-xs text-navy-400">{durationText(trip.duration_minutes)}</span>
              <span className="relative my-1 h-px w-full bg-navy-200">
                <span className="absolute -top-1 left-0 h-2 w-2 rounded-full bg-brand-600" />
                <span className="absolute -top-1 right-0 h-2 w-2 rounded-full bg-orange-500" />
              </span>
              <span className="text-xs text-navy-400">direct</span>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-navy-900">{fmtClock(trip.arrival_at)}</p>
              <p className="text-xs text-navy-400">{trip.destination_city?.name}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-navy-100 pt-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-navy-400">Date</dt>
              <dd className="font-semibold text-navy-800">{fmtDate(trip.departure_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-400">Bus</dt>
              <dd className="font-semibold text-navy-800">{trip.bus?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-400">Type</dt>
              <dd className="font-semibold text-navy-800">{titleCase(trip.bus?.bus_type ?? "")}</dd>
            </div>
            <div>
              <dt className="text-xs text-navy-400">Operator</dt>
              <dd className="font-semibold text-navy-800">{trip.operator?.company_name ?? "—"}</dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
  );
}

function InfoCards() {
  const items = [
    {
      icon: "🧳",
      title: "Baggage allowance",
      lines: ["1 hand carry up to 7 kg", "1 checked bag up to 20 kg", "Extra baggage payable onboard"],
    },
    {
      icon: "🪪",
      title: "Documents required",
      lines: ["National ID (NRC) for every traveller", "Phone number for ticket delivery", "Show QR at boarding"],
    },
    {
      icon: "↩️",
      title: "Cancellation",
      lines: ["Free changes before payment", "Refund requests reviewed in 1–2 days", "Track status from My bookings"],
    },
  ];
  return (
    <>
      {items.map((c) => (
        <Card key={c.title} className="p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-lg">{c.icon}</span>
            <h3 className="font-display text-sm font-bold text-navy-900">{c.title}</h3>
          </div>
          <ul className="mt-2.5 space-y-1 text-xs leading-relaxed text-navy-500">
            {c.lines.map((l) => (
              <li key={l} className="flex gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-navy-300" />
                {l}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}
