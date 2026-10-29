import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/common/Badge";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { BusIcon } from "@/components/common/Logo";
import { meApi, ticketsApi } from "@/services/endpoints";
import type { TicketOut } from "@/types";
import { apiTime, fmtClock, fmtDate } from "@/utils/format";

type Tab = "upcoming" | "past" | "all";

export function TicketsListPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("upcoming");
  const q = useQuery({ queryKey: ["me", "tickets"], queryFn: () => meApi.tickets(100) });

  if (q.isLoading)
    return (
      <SkeletonPage label={t("tickets.loadingList")}>
        <ListSkeleton rows={4} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const now = new Date().getTime();
  const items = [...q.data!].sort((a, b) => apiTime(a.trip?.departure_at) - apiTime(b.trip?.departure_at));
  const isUpcoming = (tk: TicketOut) => {
    const dep = apiTime(tk.trip?.departure_at);
    return Number.isFinite(dep) ? dep >= now : true;
  };
  const filtered = items.filter((tk) => (tab === "all" ? true : tab === "upcoming" ? isUpcoming(tk) : !isUpcoming(tk)));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "upcoming", label: t("tickets.tabs.upcoming"), count: items.filter(isUpcoming).length },
    { key: "past", label: t("tickets.tabs.past"), count: items.filter((tk) => !isUpcoming(tk)).length },
    { key: "all", label: t("tickets.tabs.all"), count: items.length },
  ];

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("tickets.title")} subtitle={t("tickets.subtitle")} />

      {items.length === 0 ? (
        <EmptyState
          icon="🎟️"
          title={t("tickets.empty.title")}
          description={t("tickets.empty.description")}
          action={
            <Link to="/search">
              <Button>{t("tickets.empty.action")}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-5 inline-flex rounded-2xl border border-navy-100 bg-white p-1 shadow-card">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  tab === tb.key ? "bg-brand-600 text-white shadow-glow" : "text-navy-500 hover:text-navy-800"
                }`}
              >
                {tb.label}
                <span className={`ml-1.5 text-xs ${tab === tb.key ? "text-white/70" : "text-navy-400"}`}>{tb.count}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon="🗂️" title={t("tickets.empty.noTabTitle", { tab: t(`tickets.tabs.${tab}`) })} description={t("tickets.empty.noTabDescription")} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((tk) => (
                <TicketCard key={tk.id} ticket={tk} />
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-8">
        <TicketLookup />
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketOut }) {
  const { t } = useTranslation();
  const used = Boolean(ticket.used_at);
  return (
    <Card className="overflow-hidden">
      <div className="relative overflow-hidden bg-navy-fade px-5 py-4 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(229,143,16,0.3),transparent_45%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-navy-300">{t("tickets.card.label")}</p>
            <p className="font-display text-lg font-extrabold tracking-wide">{ticket.ticket_number}</p>
          </div>
          <Badge label={t(`tickets.status.${ticket.status}`, ticket.status)} />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-navy-400">{t("tickets.card.from")}</p>
            <p className="truncate font-display text-lg font-extrabold text-navy-900">{ticket.trip?.origin ?? "—"}</p>
          </div>
          <span className="text-brand-500">
            <BusIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] uppercase tracking-widest text-navy-400">{t("tickets.card.to")}</p>
            <p className="truncate font-display text-lg font-extrabold text-navy-900">{ticket.trip?.destination ?? "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy-600">
          {ticket.trip && (
            <span>
              {fmtDate(ticket.trip.departure_at)} · {fmtClock(ticket.trip.departure_at)}
            </span>
          )}
          <span>{ticket.seat_numbers.join(", ")}</span>
          <span className="text-navy-400">{t("tickets.card.passengers", { count: ticket.passenger_names.length })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/account/tickets/${ticket.id}`}>
            <Button size="sm">{used ? t("tickets.card.viewTicket") : t("tickets.card.openETicket")}</Button>
          </Link>
          <a href={ticketsApi.pdfUrl(ticket.id)} target="_blank" rel="noreferrer">
            <Button size="sm" variant="ghost">
              {t("tickets.card.pdf")}
            </Button>
          </a>
        </div>
      </div>
    </Card>
  );
}

function TicketLookup() {
  const { t } = useTranslation();
  const [ref, setRef] = useState("");
  const [ticket, setTicket] = useState<TicketOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!ref.trim()) return;
    setLoading(true);
    setError("");
    try {
      const t = await ticketsApi.lookup({ reference: ref.trim() });
      setTicket(t);
    } catch (err) {
      setError((err as Error).message);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-display text-base font-bold text-navy-900">{t("tickets.lookup.title")}</h2>
      <p className="mt-0.5 text-sm text-navy-500">
        {t("tickets.lookup.description")}
      </p>
      <form onSubmit={lookup} className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="input flex-1"
          placeholder={t("tickets.lookup.placeholder")}
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          {t("tickets.lookup.submit")}
        </Button>
      </form>
      {error && (
        <div className="mt-3">
          <InlineError message={error} />
        </div>
      )}
      {ticket && (
        <div className="mt-4">
          <Link to={`/account/tickets/${ticket.id}`}>
            <Button variant="ghost">{t("tickets.lookup.openTicket", { number: ticket.ticket_number })}</Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
