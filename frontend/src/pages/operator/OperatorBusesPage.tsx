import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { operatorApi } from "@/services/endpoints";
import { FleetBusesView, type FleetBusRow } from "@/components/fleet/FleetBusesView";
import type { OperatorTripRow } from "@/types";

export function OperatorBusesPage() {
  const { t } = useTranslation();
  const buses = useQuery({ queryKey: ["op-buses"], queryFn: operatorApi.buses });
  const trips = useQuery({ queryKey: ["op-trips"], queryFn: operatorApi.trips });

  const rows: FleetBusRow[] = useMemo(() => {
    const latestRoute = new Map<string, OperatorTripRow>();
    for (const trip of trips.data ?? []) {
      if (!trip.origin || !trip.destination) continue;
      const cur = latestRoute.get(trip.bus_id);
      if (!cur || trip.departure_at > cur.departure_at) latestRoute.set(trip.bus_id, trip);
    }
    return (buses.data ?? []).map((bus) => {
      const trip = latestRoute.get(bus.id);
      return {
        id: bus.id,
        name: bus.name,
        registration_number: bus.registration_number,
        bus_type: bus.bus_type,
        layout: bus.layout,
        seat_capacity: bus.seat_capacity,
        is_active: bus.is_active,
        origin: trip?.origin,
        destination: trip?.destination,
        latestTripAt: trip?.departure_at,
      };
    });
  }, [buses.data, trips.data]);

  return (
    <FleetBusesView
      title={t("operator.buses.title")}
      subtitle={t("operator.buses.subtitle")}
      rows={rows}
      loading={buses.isLoading || trips.isLoading}
      error={((buses.error ?? trips.error) as Error | null)?.message ?? null}
      onRetry={() => {
        buses.refetch();
        trips.refetch();
      }}
    />
  );
}
