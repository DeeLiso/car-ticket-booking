import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/common/Badge";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, Alert } from "@/components/common/Alert";
import { DetailSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { bookingsApi, paymentsApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { fmtDateTime, fmtMoney, titleCase } from "@/utils/format";
import type { PaymentInitiateResponse } from "@/types";

const METHOD_IDS = ["MOCK", "MMPAY", "KBZPAY", "WAVEPAY", "CBPAY", "BANK_TRANSFER"] as const;
const METHOD_ICONS: Record<string, string> = {
  MOCK: "🧪",
  MMPAY: "🇲🇲",
  KBZPAY: "💜",
  WAVEPAY: "💙",
  CBPAY: "💳",
  BANK_TRANSFER: "🏦",
};

export function BookingDetailPage() {
  const { t } = useTranslation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [payError, setPayError] = useState("");
  const [cancelMsg, setCancelMsg] = useState("");
  const [qrPayment, setQrPayment] = useState<PaymentInitiateResponse | null>(null);

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
    onSuccess: (init: PaymentInitiateResponse) => {
      setPayError("");
      setQrPayment(init.qr_payload ? init : null);
      bookingQ.refetch();
    },
    onError: (err) => setPayError(apiErrorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(bookingId!, window.prompt(t("bookings.detail.cancelPrompt")) ?? undefined),
    onSuccess: (b) => {
      setCancelMsg(t("bookings.detail.cancelledToast", { ref: b.reference }));
      bookingQ.refetch();
    },
    onError: (err) => setPayError(apiErrorMessage(err)),
  });

  if (bookingQ.isLoading) return <DetailSkeleton label={t("bookings.loading")} />;
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
        title={t("bookings.detail.title", { ref: b.reference })}
        subtitle={t("bookings.detail.subtitle", { when: fmtDateTime(b.created_at) })}
        actions={<Badge label={t(`checkoutStatus.${b.status}`, b.status)} />}
      />

      {cancelMsg && (
        <div className="mb-5">
          <Alert tone="success">{cancelMsg}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 font-display font-bold text-navy-900">{t("bookings.detail.trip")}</h2>
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
              <p className="text-sm text-navy-400">{t("bookings.detail.tripUnavailable")}</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display font-bold text-navy-900">{t("bookings.detail.seatsTitle")}</h2>
            <div className="space-y-2 sm:hidden">
              {b.seats.map((s) => {
                const pax = b.passengers.find((p) => p.seat_number === s.seat_number);
                return (
                  <div key={s.seat_id} className="rounded-xl border border-navy-100 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-navy-900">{s.seat_number}</span>
                      <span className="text-sm font-semibold text-navy-900">{fmtMoney(s.price)}</span>
                    </div>
                    <dl className="mt-2 space-y-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-navy-500">{t("bookings.detail.class")}</dt>
                        <dd className="font-medium text-navy-800">{titleCase(s.category)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-navy-500">{t("bookings.detail.passenger")}</dt>
                        <dd className="break-all text-right font-medium text-navy-800">{pax?.full_name ?? "—"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-navy-500">{t("bookings.detail.phone")}</dt>
                        <dd className="break-all text-right font-medium text-navy-800">{pax?.phone ?? "—"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="shrink-0 text-navy-500">{t("bookings.detail.nationalId")}</dt>
                        <dd className="break-all text-right font-medium text-navy-800">{pax?.id_number ?? "—"}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-500">
                    <th className="py-2 pr-4">{t("bookings.detail.seat")}</th>
                    <th className="py-2 pr-4">{t("bookings.detail.class")}</th>
                    <th className="py-2 pr-4">{t("bookings.detail.passenger")}</th>
                    <th className="py-2 pr-4">{t("bookings.detail.phone")}</th>
                    <th className="py-2 pr-4">{t("bookings.detail.nationalId")}</th>
                    <th className="py-2 text-right">{t("bookings.detail.price")}</th>
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
                        <td className="py-2.5 pr-4 text-navy-500">{pax?.id_number ?? "—"}</td>
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
              <div className="flex justify-between text-navy-600"><span>{t("bookings.detail.subtotal")}</span><span>{fmtMoney(b.subtotal)}</span></div>
              <div className="flex justify-between text-navy-600"><span>{t("bookings.detail.fees")}</span><span>{fmtMoney(b.fees)}</span></div>
              <div className="mt-2 flex justify-between border-t border-navy-100 pt-2">
                <span className="font-display font-bold text-navy-900">{t("bookings.detail.total")}</span>
                <span className="font-display text-xl font-extrabold text-brand-800">{fmtMoney(b.total_amount)}</span>
              </div>
            </div>
            {b.expires_at && pending && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t("bookings.detail.heldUntil", { when: fmtDateTime(b.expires_at) })}
              </p>
            )}
          </Card>

          {pending && (
            <Card className="p-5">
              <h2 className="mb-3 font-display font-bold text-navy-900">{t("bookings.detail.payTitle")}</h2>
              {payError && (
                <div className="mb-3">
                  <InlineError message={payError} />
                </div>
              )}
              <div className="space-y-2">
                {METHOD_IDS.map((id) => (
                  <button
                    key={id}
                    className="flex w-full items-center gap-3 rounded-xl border border-navy-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={pay.isPending}
                    onClick={() => pay.mutate(id)}
                  >
                    <span className="text-xl">{METHOD_ICONS[id]}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-navy-900">{t(`bookings.methods.${id}.name`)}</span>
                      <span className="block text-xs text-navy-500">{t(`bookings.methods.${id}.desc`)}</span>
                    </span>
                    {pay.isPending && <span className="text-xs text-navy-400">…</span>}
                  </button>
                ))}
              </div>
              {b.has_ticket && b.ticket_id && (
                <p className="mt-3 text-center text-xs text-navy-400">
                  <Link to={`/account/tickets/${b.ticket_id}`} className="font-semibold text-brand-700 hover:underline">
                    {t("bookings.detail.ticketIssued")}
                  </Link>
                </p>
              )}
            </Card>
          )}

          {pending && qrPayment?.qr_payload && (
            <Card className="p-5 text-center">
              <h2 className="mb-1 font-display font-bold text-navy-900">{t("bookings.detail.scanTitle")}</h2>
              <p className="mb-4 text-xs text-navy-500">{qrPayment.instructions}</p>
              <div className="inline-block rounded-2xl border border-navy-100 bg-white p-3">
                <QRCodeSVG value={qrPayment.qr_payload} size={208} level="M" />
              </div>
              <p className="mt-4 font-display text-lg font-extrabold text-brand-800">
                {fmtMoney(b.total_amount)}
              </p>
              <p className="mt-1 text-xs text-navy-400">
                {t("bookings.detail.scanHint")}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {t("bookings.detail.waiting")}
              </div>
              <Button variant="ghost" className="mt-3 w-full" onClick={() => setQrPayment(null)}>
                {t("bookings.detail.payOtherWay")}
              </Button>
            </Card>
          )}

          {b.status === "CONFIRMED" && (
            <Card className="p-5 text-center">
              <p className="text-emerald-600">{t("bookings.detail.confirmed")}</p>
              {b.ticket_id && (
                <Button className="mt-3 w-full" variant="accent" onClick={() => window.open(`/account/tickets/${b.ticket_id}`, "_self")}>
                  {t("bookings.detail.viewTicket")}
                </Button>
              )}
            </Card>
          )}

          {b.status === "REFUND_PENDING" && (
            <Alert tone="info">{t("bookings.detail.refundPending")}</Alert>
          )}
          {b.status === "REFUNDED" && (
            <Alert tone="success">{t("bookings.detail.refunded")}</Alert>
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
              {t("bookings.detail.cancelButton")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}