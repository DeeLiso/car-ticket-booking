import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { adminApi } from "@/services/endpoints";
import { FleetBusesView, type FleetBusRow } from "@/components/fleet/FleetBusesView";

export function AdminFleetPage() {
  const { t } = useTranslation();
  const fleet = useQuery({ queryKey: ["admin-fleet"], queryFn: adminApi.fleet });

  const rows: FleetBusRow[] = useMemo(
    () =>
      (fleet.data ?? []).map((r) => ({
        id: r.bus_id,
        name: r.bus_name,
        registration_number: r.registration_number,
        bus_type: r.bus_type,
        layout: r.layout,
        seat_capacity: r.seat_capacity,
        is_active: r.is_active,
        operator: r.operator,
        origin: r.origin,
        destination: r.destination,
        latestTripAt: r.latest_trip_at,
      })),
    [fleet.data],
  );

  return (
    <FleetBusesView
      title={t("admin.fleet.title")}
      subtitle={t("admin.fleet.subtitle")}
      rows={rows}
      showOperator
      loading={fleet.isLoading}
      error={(fleet.error as Error | null)?.message ?? null}
      onRetry={() => fleet.refetch()}
    />
  );
}