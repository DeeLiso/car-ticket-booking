import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/common/Badge";
import { InlineError } from "@/components/common/Alert";
import { DetailSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { ticketsApi } from "@/services/endpoints";
import { fmtDateTime } from "@/utils/format";

export function TicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const q = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketsApi.detail(ticketId!),
    enabled: !!ticketId,
  });

  if (q.isLoading) return <DetailSkeleton label="Loading ticket" />;
  if (q.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const t = q.data!;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-navy-900 sm:text-3xl">Your e-ticket</h1>
          <p className="mt-1 text-sm text-navy-500">Present the QR below at the boarding gate.</p>
        </div>
        <Badge label={t.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Premium ticket */}
        <div className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-pop">
          <div className="relative overflow-hidden bg-navy-fade px-7 py-6 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(229,143,16,0.3),transparent_45%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 font-display text-lg font-extrabold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-xs font-black">T</span>
                  TikeSho
                </p>
                <p className="mt-3 text-xs uppercase tracking-widest text-navy-300">Boarding pass</p>
                <p className="font-display text-xl font-extrabold tracking-wide sm:text-2xl">{t.ticket_number}</p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
                {t.payment_status ?? "—"}
              </span>
            </div>
          </div>

          <div className="grid gap-6 p-7 sm:grid-cols-[1fr_auto]">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-widest text-navy-400">From</p>
                  <p className="truncate font-display text-2xl font-extrabold text-navy-900">{t.trip?.origin ?? "—"}</p>
                </div>
                <span className="text-brand-500">✈</span>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[11px] uppercase tracking-widest text-navy-400">To</p>
                  <p className="truncate font-display text-2xl font-extrabold text-navy-900">{t.trip?.destination ?? "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-navy-100 bg-navy-50/60 p-4 sm:grid-cols-4">
                {[
                  ["Departure", t.trip ? fmtDateTime(t.trip.departure_at) : "—"],
                  ["Operator", t.trip?.operator ?? "—"],
                  ["Bus", t.trip?.bus_name ?? "—"],
                  ["Reg.", t.trip?.bus_registration ?? "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[11px] uppercase tracking-wide text-navy-400">{k}</p>
                    <p className="mt-0.5 text-sm font-semibold text-navy-800">{v}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wide text-navy-400">Passengers & seats</p>
                <div className="flex flex-wrap gap-2">
                  {t.passenger_names.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-2 rounded-xl border border-navy-100 bg-white px-3 py-2 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">
                        {t.seat_numbers[i]}
                      </span>
                      <span className="font-medium text-navy-800">{p}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-navy-100 pt-4 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-navy-400">Booking ref</p>
                  <p className="font-semibold text-navy-800">{t.booking_reference ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-navy-400">Issued</p>
                  <p className="font-semibold text-navy-800">{fmtDateTime(t.issued_at)}</p>
                </div>
                {t.used_at && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-navy-400">Used</p>
                    <p className="font-semibold text-navy-800">{fmtDateTime(t.used_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Perforated QR stub */}
            <div className="relative flex flex-col items-center justify-center gap-4 border-navy-100 sm:border-l sm:pl-6">
              <div className="absolute -top-7 left-1/2 hidden h-6 w-6 -translate-x-1/2 rounded-full bg-white sm:block" />
              <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
                <img
                  src={ticketsApi.qrUrl(t.id)}
                  alt={`QR for ${t.ticket_number}`}
                  className="h-44 w-44 object-contain"
                  width={176}
                  height={176}
                />
              </div>
              <p className="max-w-[10rem] text-center text-xs text-navy-400">
                Single-use &amp; tamper-evident
              </p>
              <Button variant="ghost" className="w-full" onClick={() => window.open(ticketsApi.pdfUrl(t.id), "_blank")}>
                ⬇ Download PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Helper panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-display font-bold text-navy-900">Before you board</h2>
            <ul className="mt-3 space-y-2 text-sm text-navy-600">
              <li className="flex gap-2"><span className="text-brand-500">•</span> Arrive 20 minutes early.</li>
              <li className="flex gap-2"><span className="text-brand-500">•</span> Keep this QR ready on your phone.</li>
              <li className="flex gap-2"><span className="text-brand-500">•</span> Carry a valid ID for verification.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
            Scan happens once. A second scan will be flagged as already used.
          </div>
        </div>
      </div>
    </div>
  );
}
