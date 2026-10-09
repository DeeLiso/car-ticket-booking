import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, PageHeader } from "@/components/common/Card";
import { InlineError, PageLoader } from "@/components/common/Alert";
import { adminApi } from "@/services/endpoints";

export function AdminBusesPage() {
  const buses = useQuery({ queryKey: ["admin-buses"], queryFn: () => adminApi.buses(1, 20) });

  if (buses.isLoading) return <PageLoader />;
  if (buses.error)
    return (
      <div className="px-8 py-10">
        <InlineError message={(buses.error as Error).message} onRetry={() => buses.refetch()} />
      </div>
    );

  const items = buses.data?.items ?? [];
  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title="Buses" subtitle="Fleet registry and seat layouts." />
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs uppercase tracking-wide text-navy-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Reg</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Layout</th>
                <th className="px-5 py-3">Seats</th>
                <th className="px-5 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-navy-50">
                  <td className="px-5 py-2.5 font-semibold text-navy-900">{b.name}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.registration_number}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.bus_type}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.layout}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.seat_capacity}</td>
                  <td className="px-5 py-2.5 text-navy-500">{b.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}