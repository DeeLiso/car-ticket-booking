import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { meApi } from "@/services/endpoints";

/**
 * Unread notification count used by the bottom-nav message badge.
 * Shares the `["me", "notifications"]` cache with AppShell and the
 * notifications page so all three stay in sync after a mark-read.
 */
export function useUnreadMessages() {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => meApi.notifications(100),
    enabled: !!user && user.role === "PASSENGER",
    staleTime: 60_000,
  });

  return (query.data ?? []).filter((n) => !n.read_at).length;
}
