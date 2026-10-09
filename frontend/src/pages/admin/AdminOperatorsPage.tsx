import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, TableSkeleton } from "@/components/common/Skeleton";
import { Field, Input } from "@/components/common/Field";
import { Button } from "@/components/common/Button";
import { adminApi } from "@/services/endpoints";

export function AdminOperatorsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    company_name: "",
    contact_phone: "",
    is_verified: true,
  });
  const [error, setError] = useState("");

  const ops = useQuery({ queryKey: ["admin-ops"], queryFn: adminApi.operators });

  const create = useMutation({
    mutationFn: () => adminApi.createOperator({ ...form, license_number: undefined }),
    onSuccess: () => {
      setOpen(false);
      setError("");
      setForm({ email: "", password: "", full_name: "", company_name: "", contact_phone: "", is_verified: true });
      qc.invalidateQueries({ queryKey: ["admin-ops"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  if (ops.isLoading)
    return (
      <SkeletonPage label="Loading operators" actions={1}>
        <TableSkeleton columns={5} rows={6} />
      </SkeletonPage>
    );
  if (ops.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(ops.error as Error).message} onRetry={() => ops.refetch()} />
      </div>
    );

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title="Operators"
        subtitle="Onboard bus operators and manage verification."
        actions={<Button onClick={() => setOpen((o) => !o)}>{open ? "Close" : "+ New operator"}</Button>}
      />
      {error && (
        <div className="mb-5">
          <InlineError message={error} />
        </div>
      )}
      {open && (
        <Card className="mb-6 p-5">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Company name">
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </Field>
            <Field label="Operator full name">
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Temporary password">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={create.isPending}>Create operator</Button>
            </div>
          </form>
        </Card>
      )}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Buses</th>
              </tr>
            </thead>
            <tbody>
              {ops.data!.map((o) => (
                <tr key={o.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{o.company_name}</td>
                  <td className="px-5 py-2.5 text-navy-500">{o.contact_phone ?? "—"}</td>
                  <td className="px-5 py-2.5 text-navy-500">{o.email}</td>
                  <td className="px-5 py-2.5 text-navy-500">{o.is_verified ? "Yes" : "No"}</td>
                  <td className="px-5 py-2.5 text-navy-500">{o.buses_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}