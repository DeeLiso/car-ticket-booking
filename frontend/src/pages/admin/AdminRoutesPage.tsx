import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { Field, Select } from "@/components/common/Field";
import { Button } from "@/components/common/Button";
import { adminApi, catalogApi } from "@/services/endpoints";

export function AdminRoutesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ origin_city_id: "", destination_city_id: "", duration_minutes: 180 });
  const [error, setError] = useState("");

  const routes = useQuery({ queryKey: ["admin-routes"], queryFn: adminApi.routes });
  const cities = useQuery({ queryKey: ["cities"], queryFn: catalogApi.cities });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createRoute({
        origin_city_id: form.origin_city_id,
        destination_city_id: form.destination_city_id,
        duration_minutes: Number(form.duration_minutes),
      }),
    onSuccess: () => {
      setOpen(false);
      setError("");
      setForm({ origin_city_id: "", destination_city_id: "", duration_minutes: 180 });
      qc.invalidateQueries({ queryKey: ["admin-routes"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  if (routes.isLoading || cities.isLoading) return <PageLoader />;
  if (routes.error || cities.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={((routes.error ?? cities.error) as Error).message} onRetry={() => { routes.refetch(); cities.refetch(); }} />
      </div>
    );

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title="Routes"
        subtitle="Define city pairs and standard durations."
        actions={<Button onClick={() => setOpen((o) => !o)}>{open ? "Close" : "+ New route"}</Button>}
      />
      {error && (
        <div className="mb-5">
          <InlineError message={error} />
        </div>
      )}
      {open && (
        <Card className="mb-6 p-5">
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.origin_city_id === form.destination_city_id) {
                setError("Origin and destination must differ.");
                return;
              }
              create.mutate();
            }}
          >
            <Field label="Origin">
              <Select value={form.origin_city_id} onChange={(e) => setForm({ ...form, origin_city_id: e.target.value })}>
                <option value="" disabled>Choose</option>
                {cities.data!.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Destination">
              <Select value={form.destination_city_id} onChange={(e) => setForm({ ...form, destination_city_id: e.target.value })}>
                <option value="" disabled>Choose</option>
                {cities.data!.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end gap-3">
              <Field label="Duration (min)">
                <input className="input" type="number" min={30} max={600} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </Field>
              <Button type="submit" loading={create.isPending}>Create</Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {routes.data!.map((r) => (
                <tr key={r.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-semibold text-navy-900">
                    {r.origin_city?.name ?? r.origin_city_id} → {r.destination_city?.name ?? r.destination_city_id}
                  </td>
                  <td className="px-5 py-2.5 text-navy-500">{r.duration_minutes} min</td>
                  <td className="px-5 py-2.5 text-navy-500">{r.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}