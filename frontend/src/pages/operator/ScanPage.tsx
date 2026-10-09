import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { Field, Input } from "@/components/common/Field";
import { Button } from "@/components/common/Button";
import { InlineError, Alert } from "@/components/common/Alert";
import { ticketsApi } from "@/services/endpoints";
import type { ValidateTicketResponse } from "@/types";
import { titleCase } from "@/utils/format";

export function ScanPage() {
  const [token, setToken] = useState("");
  const [tripId, setTripId] = useState("");
  const [result, setResult] = useState<ValidateTicketResponse | null>(null);
  const [error, setError] = useState("");

  const validate = useMutation({
    mutationFn: () => ticketsApi.validate(token.trim(), tripId.trim() || undefined),
    onSuccess: (r) => {
      setResult(r);
      setError("");
    },
    onError: (e) => {
      setResult(null);
      setError((e as Error).message);
    },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="Validate QR ticket" subtitle="Scan or paste a secure ticket token to check validity." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <form
            className="grid gap-4 sm:grid-cols-[1.2fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!token.trim()) return;
              validate.mutate();
            }}
          >
            <Field label="QR token (opaque)">
              <Input
                placeholder="tk_…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm"
              />
            </Field>
            <Field label="Trip ID (optional)">
              <Input placeholder="c3a…" value={tripId} onChange={(e) => setTripId(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={validate.isPending}>Validate</Button>
            </div>
          </form>
          {error && (
            <div className="mt-4">
              <InlineError message={error} />
            </div>
          )}
          {result && (
            <div className="mt-6">
              <Alert tone={result.valid ? "success" : "error"}>
                <div className="flex flex-col gap-1">
                  <p className="text-base font-semibold">{titleCase(result.outcome)}</p>
                  <p>{result.message}</p>
                </div>
              </Alert>
              {result.valid && (
                <Card className="mt-4 p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <span className="text-sm text-navy-500">Ticket</span>
                    <span className="text-sm font-semibold text-navy-900">{result.ticket_number}</span>
                    <span className="text-sm text-navy-500">Booking ref</span>
                    <span className="text-sm font-semibold text-navy-900">{result.booking_reference}</span>
                    <span className="text-sm text-navy-500">Passengers</span>
                    <span className="text-sm font-semibold text-navy-900">{result.passenger_names.join(", ")}</span>
                    <span className="text-sm text-navy-500">Seats</span>
                    <span className="text-sm font-semibold text-navy-900">{result.seat_numbers.join(", ")}</span>
                    <span className="text-sm text-navy-500">Trip ID</span>
                    <span className="text-sm font-mono text-xs text-navy-500">{result.trip_id}</span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </Card>
        <Card className="p-5 text-sm text-navy-600">
          <h3 className="mb-2 font-display font-bold text-navy-900">Notes</h3>
          <ul className="list-inside space-y-1 list-disc">
            <li>Provide trip_id to enforce “wrong trip” detection.</li>
            <li>Tokens are opaque and single-use. Each scan consumes it.</li>
            <li>Already used, cancelled, or not confirmed tickets are rejected.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}