import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ClipboardPaste,
  History,
  Info,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { Card, PageHeader } from "@/components/common/Card";
import { Field, Input } from "@/components/common/Field";
import { Button } from "@/components/common/Button";
import { InlineError } from "@/components/common/Alert";
import { ticketsApi } from "@/services/endpoints";
import type { ValidateTicketResponse } from "@/types";

interface ScanLogEntry {
  id: number;
  at: number;
  outcome: string;
  valid: boolean;
  reference: string | null;
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-emerald-200/70 bg-white/80 px-3 py-2 dark:border-emerald-500/25 dark:bg-emerald-500/5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700/70 dark:text-emerald-300/70">
        {label}
      </dt>
      <dd
        className={`mt-0.5 break-words text-sm font-semibold text-navy-900 ${
          mono ? "font-mono text-xs font-medium" : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

export function ScanPage() {
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [tripId, setTripId] = useState("");
  const [result, setResult] = useState<ValidateTicketResponse | null>(null);
  const [error, setError] = useState("");
  const [log, setLog] = useState<ScanLogEntry[]>([]);
  const logId = useRef(0);

  const focusToken = () => {
    requestAnimationFrame(() => document.getElementById("scan-token")?.focus());
  };

  const validate = useMutation({
    mutationFn: () => ticketsApi.validate(token.trim(), tripId.trim() || undefined),
    onSuccess: (r) => {
      setResult(r);
      setError("");
      logId.current += 1;
      setLog((prev) =>
        [
          {
            id: logId.current,
            at: Date.now(),
            outcome: r.outcome,
            valid: r.valid,
            reference: r.booking_reference ?? null,
          },
          ...prev,
        ].slice(0, 8),
      );
    },
    onError: (e) => {
      setResult(null);
      setError((e as Error).message);
      logId.current += 1;
      setLog((prev) =>
        [
          { id: logId.current, at: Date.now(), outcome: "ERROR", valid: false, reference: null },
          ...prev,
        ].slice(0, 8),
      );
    },
  });

  const outcomeLabel = (outcome: string) =>
    t(`operator.scan.outcome.${outcome}`, { defaultValue: outcome });

  const seatNumbers = result?.seat_numbers?.join(", ") ?? "";
  const passengerNames = result?.passenger_names?.join(", ") ?? "";

  async function pasteToken() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setToken(text.trim());
    } catch {
      /* clipboard unavailable — let the user paste manually */
    }
    focusToken();
  }

  function clearToken() {
    setToken("");
    focusToken();
  }

  function scanNext() {
    setToken("");
    setResult(null);
    setError("");
    focusToken();
  }

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={t("operator.scan.title")}
        subtitle={t("operator.scan.subtitle")}
        actions={
          <span className="hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t("operator.scan.secureBadge")}
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-navy-100 bg-navy-50/60 px-5 py-4 dark:border-[#1f2d49] dark:bg-[#16213a]">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm"
            >
              <QrCode className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-navy-900">
                {t("operator.scan.scanConsole")}
              </h2>
              <p className="truncate text-xs text-navy-500">{t("operator.scan.scanConsoleHint")}</p>
            </div>
          </div>

          <form
            className="grid gap-4 px-5 py-5 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!token.trim() || validate.isPending) return;
              validate.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <Field label={t("operator.scan.tokenLabel")}>
                <div className="relative">
                  <ScanLine
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
                  />
                  <Input
                    id="scan-token"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="tk_…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="pl-10 pr-20 font-mono text-sm"
                  />
                  <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                    {token && (
                      <button
                        type="button"
                        onClick={clearToken}
                        aria-label={t("operator.scan.clearToken")}
                        title={t("operator.scan.clearToken")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 transition hover:bg-navy-100 hover:text-navy-700 focus-visible:bg-navy-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={pasteToken}
                      aria-label={t("operator.scan.paste")}
                      title={t("operator.scan.paste")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50"
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Field>
            </div>

            <Field label={t("operator.scan.tripIdLabel")}>
              <Input
                placeholder="c3a…"
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-sm"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                loading={validate.isPending}
                disabled={!token.trim()}
              >
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                {t("operator.scan.validate")}
              </Button>
            </div>
          </form>

          {(error || result) && (
            <div className="border-t border-navy-100 bg-navy-50/30 px-5 py-5 dark:border-[#1f2d49] dark:bg-[#0f1830]/60">
              {error && <InlineError message={error} />}

              {result?.valid && (
                <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="flex flex-wrap items-start gap-3 border-b border-emerald-200/70 px-4 py-4 dark:border-emerald-500/20">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/15"
                    >
                      <CheckCircle2 className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-extrabold text-emerald-800 dark:text-emerald-200">
                        {t("operator.scan.validTitle")}
                      </p>
                      <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300/90">
                        {result.message}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {outcomeLabel(result.outcome)}
                    </span>
                  </div>

                  <dl className="grid gap-2.5 px-4 py-4 sm:grid-cols-2">
                    <Detail label={t("operator.scan.ticket")} value={result.ticket_number ?? ""} mono />
                    <Detail
                      label={t("operator.scan.bookingRef")}
                      value={result.booking_reference ?? ""}
                      mono
                    />
                    <Detail label={t("operator.scan.passengers")} value={passengerNames} />
                    <Detail label={t("operator.scan.seats")} value={seatNumbers} />
                    <div className="sm:col-span-2">
                      <Detail label={t("operator.scan.tripId")} value={result.trip_id ?? ""} mono />
                    </div>
                  </dl>

                  <div className="flex justify-end border-t border-emerald-200/70 px-4 py-3 dark:border-emerald-500/20">
                    <Button size="sm" variant="ghost" onClick={scanNext}>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("operator.scan.scanNext")}
                    </Button>
                  </div>
                </div>
              )}

              {result && !result.valid && (
                <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
                  <div className="flex flex-wrap items-start gap-3 px-4 py-4">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm ring-4 ring-red-500/15"
                    >
                      <XCircle className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-extrabold text-red-800 dark:text-red-200">
                        {t("operator.scan.invalidTitle")}
                      </p>
                      <p className="mt-0.5 text-sm text-red-700 dark:text-red-300/90">{result.message}</p>
                    </div>
                    <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {outcomeLabel(result.outcome)}
                    </span>
                  </div>
                  <div className="flex justify-end border-t border-red-200/70 px-4 py-3 dark:border-red-500/20">
                    <Button size="sm" variant="ghost" onClick={scanNext}>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("operator.scan.scanNext")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-2 border-b border-navy-100 px-5 py-4 dark:border-[#1f2d49]">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900">
                <History className="h-4 w-4 text-navy-400" aria-hidden="true" />
                {t("operator.scan.sessionLog")}
              </h2>
              {log.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLog([])}
                  className="text-xs font-semibold text-navy-400 transition hover:text-red-600"
                >
                  {t("operator.scan.clearLog")}
                </button>
              )}
            </div>

            {log.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-navy-400">
                {t("operator.scan.sessionEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-navy-50 dark:divide-[#1f2d49]">
                {log.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        entry.valid ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-800">
                        {outcomeLabel(entry.outcome)}
                      </p>
                      <p className="truncate text-xs text-navy-400">
                        {entry.reference ?? "—"} ·{" "}
                        {new Date(entry.at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {entry.valid ? (
                      <CheckCircle2
                        className="h-4 w-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-navy-900">
              <Info className="h-4 w-4 text-navy-400" aria-hidden="true" />
              {t("operator.scan.notesTitle")}
            </h2>
            <ul className="space-y-3">
              {["note1", "note2", "note3"].map((key, index) => (
                <li key={key} className="flex gap-2.5 text-sm text-navy-600">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700"
                  >
                    {index + 1}
                  </span>
                  <span>{t(`operator.scan.${key}`)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
