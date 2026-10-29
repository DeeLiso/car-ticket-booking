import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, CreditCard, Info, Ticket } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { ListSkeleton, SkeletonPage } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { meApi } from "@/services/endpoints";
import type { NotificationOut } from "@/types";
import { apiTime, fmtDateTime } from "@/utils/format";

const typeMeta: Record<string, { icon: LucideIcon; ring: string; text: string }> = {
  BOOKING: { icon: Ticket, ring: "bg-brand-50", text: "text-brand-700" },
  PAYMENT: { icon: CreditCard, ring: "bg-emerald-50", text: "text-emerald-700" },
  TRIP: { icon: CalendarClock, ring: "bg-amber-50", text: "text-amber-700" },
  SYSTEM: { icon: Info, ring: "bg-navy-100", text: "text-navy-600" },
};

export function NotificationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["me", "notifications"], queryFn: () => meApi.notifications(100) });
  const [busy, setBusy] = useState(false);

  if (q.isLoading)
    return (
      <SkeletonPage label={t("notifications.loading")}>
        <ListSkeleton rows={5} />
      </SkeletonPage>
    );
  if (q.error)
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  const items = [...q.data!].sort((a, b) => apiTime(b.created_at) - apiTime(a.created_at));
  const unread = items.filter((n) => !n.read_at);

  const markRead = async (id: string) => {
    await meApi.markNotificationRead(id);
    await qc.invalidateQueries({ queryKey: ["me", "notifications"] });
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await Promise.all(unread.map((n) => meApi.markNotificationRead(n.id)));
      await qc.invalidateQueries({ queryKey: ["me", "notifications"] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader
        title={t("notifications.title")}
        subtitle={unread.length > 0 ? t("notifications.subtitleUnread", { count: unread.length }) : t("notifications.subtitleCaughtUp")}
        actions={
          unread.length > 0 ? (
            <Button variant="ghost" loading={busy} onClick={() => void markAll()}>
              {t("notifications.markAllRead")}
            </Button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState icon="🔔" title={t("notifications.emptyTitle")} description={t("notifications.emptyDescription")} />
      ) : (
        <Card className="divide-y divide-navy-100">
          {items.map((n) => (
            <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
          ))}
        </Card>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationOut;
  onMarkRead: (id: string) => void;
}) {
  const { t } = useTranslation();
  const meta = typeMeta[notification.type] ?? typeMeta.SYSTEM;
  const Icon = meta.icon;
  const unread = !notification.read_at;

  return (
    <div className={`flex gap-4 p-5 transition ${unread ? "bg-brand-50/40" : ""}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.ring} ${meta.text}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 font-semibold text-navy-900">{notification.title}</p>
          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label={t("notifications.unread")} />}
        </div>
        {notification.body && <p className="mt-0.5 whitespace-pre-line text-sm text-navy-600">{notification.body}</p>}
        <div className="mt-2 flex items-center gap-3 text-xs text-navy-400">
          <span>{fmtDateTime(notification.created_at)}</span>
          {notification.link && (
            <Link to={notification.link} className="font-semibold text-brand-700 hover:underline">
              {t("notifications.view")}
            </Link>
          )}
          {unread && (
            <button
              type="button"
              className="font-semibold text-navy-500 hover:text-navy-800"
              onClick={() => onMarkRead(notification.id)}
            >
              {t("notifications.markRead")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
