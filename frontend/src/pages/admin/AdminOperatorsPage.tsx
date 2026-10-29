import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { SkeletonPage, ListSkeleton, TableSkeleton } from "@/components/common/Skeleton";
import { Field, Input, Select } from "@/components/common/Field";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { adminApi } from "@/services/endpoints";
import type { OperatorOut } from "@/types";

type VerifiedFilter = "all" | "verified" | "unverified";

const EMPTY_FORM = {
  email: "",
  password: "",
  full_name: "",
  company_name: "",
  contact_phone: "",
  is_verified: true,
};

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function AdminOperatorsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorOut | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState<VerifiedFilter>("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const ops = useQuery({ queryKey: ["admin-ops"], queryFn: adminApi.operators });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (ops.data ?? []).filter((o) => {
      const matchQ =
        q === "" ||
        [o.company_name, o.email, o.contact_phone].some((f) => (f ?? "").toLowerCase().includes(q));
      const matchV =
        verified === "all" || (verified === "verified" ? o.is_verified : !o.is_verified);
      return matchQ && matchV;
    });
  }, [ops.data, search, verified]);

  const summary = useMemo(
    () => {
      const operators = ops.data ?? [];
      return {
        total: operators.length,
        verified: operators.filter((operator) => operator.is_verified).length,
        unverified: operators.filter((operator) => !operator.is_verified).length,
        buses: operators.reduce((total, operator) => total + operator.buses_count, 0),
      };
    },
    [ops.data],
  );

  const create = useMutation({
    mutationFn: () => adminApi.createOperator({ ...form, license_number: undefined }),
    onSuccess: () => {
      setOpen(false);
      setError("");
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["admin-ops"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const update = useMutation({
    mutationFn: (id: string) =>
      adminApi.updateOperator(id, {
        full_name: form.full_name,
        company_name: form.company_name,
        contact_phone: form.contact_phone || null,
        is_verified: form.is_verified,
      }),
    onSuccess: () => {
      setEditing(null);
      setOpen(false);
      setError("");
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ["admin-ops"] });
    },
    onError: (e) => setError((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteOperator(id),
    onSuccess: () => {
      setDeletingId(null);
      setError("");
      qc.invalidateQueries({ queryKey: ["admin-ops"] });
    },
    onError: (e) => {
      setDeletingId(null);
      setError((e as Error).message);
    },
  });

  const startEdit = (o: OperatorOut) => {
    setEditing(o);
    setOpen(true);
    setForm({
      email: o.email ?? "",
      password: "",
      full_name: o.full_name ?? "",
      company_name: o.company_name,
      contact_phone: o.contact_phone ?? "",
      is_verified: o.is_verified,
    });
    setError("");
    window.scrollTo({ top: 0 });
  };

  const cancelForm = () => {
    setEditing(null);
    setOpen(false);
    setForm(EMPTY_FORM);
    setError("");
  };

  const confirmDelete = (o: OperatorOut) => {
    const ok = window.confirm(
      t("admin.operators.deleteConfirm", { name: o.company_name }),
    );
    if (ok) {
      setDeletingId(o.id);
      remove.mutate(o.id);
    }
  };

  const isSubmitting = create.isPending || update.isPending;

  if (ops.isLoading)
    return (
      <SkeletonPage label={t("admin.operators.loading")} actions={1}>
        <ListSkeleton className="lg:hidden" rows={4} />
        <div className="hidden lg:block">
          <TableSkeleton columns={6} rows={6} />
        </div>
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
        title={t("admin.operators.title")}
        subtitle={t("admin.operators.subtitle")}
        actions={
          <Button className="hidden lg:inline-flex" onClick={() => (open && !editing ? cancelForm() : setOpen(true))}>
            {open && !editing ? t("admin.operators.close") : editing ? t("admin.operators.newOperator") : t("admin.operators.newOperator")}
          </Button>
        }
      />
      {error && (
        <div className="mb-5">
          <InlineError message={error} />
        </div>
      )}
      <Card className="mb-6 overflow-hidden p-0">
        <dl className="grid grid-cols-2 divide-x divide-y divide-navy-100 sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: t("admin.operators.title"), value: summary.total, accent: "bg-brand-500" },
            { label: t("admin.operators.verified"), value: summary.verified, accent: "bg-emerald-500" },
            { label: t("admin.operators.unverified"), value: summary.unverified, accent: "bg-orange-500" },
            { label: t("admin.operators.buses"), value: summary.buses, accent: "bg-navy-400" },
          ].map((stat) => (
            <div key={stat.label} className="flex min-h-[92px] items-center gap-3 px-4 py-4 sm:px-5">
              <span aria-hidden="true" className={`h-9 w-1 shrink-0 rounded-full ${stat.accent}`} />
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-500">{stat.label}</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold leading-none tabular-nums text-navy-900">
                  {stat.value.toLocaleString()}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>
      {open && (
        <Card className="mb-6 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                {t("admin.operators.title")}
              </p>
              <h2 className="mt-1 font-display text-xl font-extrabold text-navy-900">
                {editing ? t("admin.operators.editTitle", { name: editing.company_name }) : t("admin.operators.newOperator")}
              </h2>
            </div>
            <span aria-hidden="true" className="hidden h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 sm:flex">
              <PencilIcon />
            </span>
          </div>
          <form
            className="mt-4 grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (editing) update.mutate(editing.id);
              else create.mutate();
            }}
          >
            <Field label={t("admin.operators.companyName")}>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </Field>
            <Field label={t("admin.operators.contactPhone")}>
              <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </Field>
            <Field label={t("admin.operators.fullName")}>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </Field>
            {editing ? (
              <div className="flex items-center gap-3 pt-2">
                <input
                  id="op-verified"
                  type="checkbox"
                  checked={form.is_verified}
                  onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-300 accent-brand-600 focus-visible:outline-brand-600"
                />
                <label htmlFor="op-verified" className="text-sm font-medium text-navy-700">
                  {t("admin.operators.verified")}
                </label>
              </div>
            ) : (
              <>
                <Field label={t("admin.operators.email")}>
                  <Input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label={t("admin.operators.tempPassword")}>
                  <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </Field>
              </>
            )}
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit" loading={isSubmitting}>
                {editing ? t("admin.operators.saveChanges") : t("admin.operators.create")}
              </Button>
              <Button type="button" variant="ghost" onClick={cancelForm} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.operators.searchPlaceholder")}
            aria-label={t("admin.operators.searchAria")}
            className="pl-11"
          />
        </div>
        <div className="w-full sm:w-52 sm:shrink-0">
          <Select
            value={verified}
            onChange={(e) => setVerified(e.target.value as VerifiedFilter)}
            className="w-full"
            aria-label={t("admin.operators.filterAria")}
          >
            <option value="all">{t("admin.operators.allStatuses")}</option>
            <option value="verified">{t("admin.operators.verifiedOption")}</option>
            <option value="unverified">{t("admin.operators.unverified")}</option>
          </Select>
        </div>
      </div>

      <Button
        className="mb-4 w-full lg:hidden"
        onClick={() => (open && !editing ? cancelForm() : setOpen(true))}
      >
        <span aria-hidden="true" className="text-lg leading-none">{open && !editing ? "×" : "+"}</span>
        {open && !editing ? t("admin.operators.close") : t("admin.operators.newOperator")}
      </Button>

      <div className="min-h-[55vh] space-y-4 pb-[calc(10rem+env(safe-area-inset-bottom))] lg:hidden">
        {filtered.length === 0 ? (
          <EmptyState icon="🚌" title={t("admin.operators.emptyTitle")} description={t("admin.operators.emptyDesc")} />
        ) : (
          filtered.map((o) => (
            <Card key={o.id} className="p-4 transition-shadow hover:shadow-card-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-display text-lg font-extrabold text-brand-700">
                    {o.company_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-navy-900">{o.company_name}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-brand-700" title={o.email ?? undefined}>{o.email ?? "—"}</p>
                    {o.full_name && <p className="mt-0.5 truncate text-[11px] text-navy-500">{o.full_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    aria-label={t("admin.operators.editAria", { name: o.company_name })}
                    title={t("common.edit")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-brand-600"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(o)}
                    aria-label={t("admin.operators.deleteAria", { name: o.company_name })}
                    title={t("common.delete")}
                    disabled={deletingId === o.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-red-600 disabled:opacity-50"
                  >
                    {deletingId === o.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <TrashIcon />}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-navy-100 pt-3">
                <Badge label={o.is_verified ? t("admin.operators.verifiedOption") : t("admin.operators.unverified")} />
                <span className="text-xs font-semibold text-navy-500">
                  {t("admin.dashboard.busesHint", { count: o.buses_count })}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 text-navy-500">{t("admin.operators.phone")}</dt>
                  <dd className="break-all text-right font-medium text-navy-800">{o.contact_phone ?? "—"}</dd>
                </div>
              </dl>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-navy-500">
                <th className="px-5 py-3.5">{t("admin.operators.company")}</th>
                <th className="px-5 py-3.5">{t("admin.operators.contact")}</th>
                <th className="px-5 py-3.5">{t("admin.operators.email")}</th>
                <th className="px-5 py-3.5">{t("admin.operators.verified")}</th>
                <th className="px-5 py-3.5">{t("admin.operators.buses")}</th>
                <th className="px-5 py-3.5 text-right">{t("admin.operators.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-navy-500">
                    {t("admin.operators.noMatchRow")}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-b border-navy-50 transition-colors last:border-0 hover:bg-navy-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-display font-extrabold text-brand-700">
                          {o.company_name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy-900">{o.company_name}</p>
                          {o.full_name && <p className="mt-0.5 truncate text-xs text-navy-500">{o.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-navy-600">{o.contact_phone ?? "—"}</td>
                    <td className="px-5 py-3 text-navy-600">{o.email}</td>
                    <td className="px-5 py-3">
                      <Badge label={o.is_verified ? t("admin.operators.verifiedOption") : t("admin.operators.unverified")} />
                    </td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-navy-800">{o.buses_count}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(o)}
                          aria-label={t("admin.operators.editAria", { name: o.company_name })}
                          title={t("common.edit")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(o)}
                          aria-label={t("admin.operators.deleteAria", { name: o.company_name })}
                          title={t("common.delete")}
                          disabled={deletingId === o.id}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          {deletingId === o.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" /> : <TrashIcon />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}