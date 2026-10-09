import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { catalogApi, type TripSearchQuery } from "@/services/endpoints";
import { todayInputValue } from "@/utils/format";
import { Button } from "@/components/common/Button";
import { Field, Select, Input } from "@/components/common/Field";

export interface SearchParams {
  origin_city_id: string;
  destination_city_id: string;
  departure_date: string;
  passengers: number;
}

export function normalizeSearchParams(q: Record<string, string | undefined>): SearchParams {
  return {
    origin_city_id: q.origin_city_id ?? "",
    destination_city_id: q.destination_city_id ?? "",
    departure_date: q.departure_date ?? todayInputValue(),
    passengers: Number(q.passengers ?? 1),
  };
}

export function SearchForm({
  initial,
  variant = "panel",
  onSubmit,
}: {
  initial: Partial<SearchParams>;
  variant?: "panel" | "compact";
  onSubmit?: (p: SearchParams) => void;
}) {
  const navigate = useNavigate();
  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: catalogApi.cities });
  const [form, setForm] = useState<SearchParams>({
    origin_city_id: initial.origin_city_id ?? "",
    destination_city_id: initial.destination_city_id ?? "",
    departure_date: initial.departure_date ?? todayInputValue(),
    passengers: initial.passengers ?? 1,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(form);
      return;
    }
    const params = new URLSearchParams({
      origin_city_id: form.origin_city_id,
      destination_city_id: form.destination_city_id,
      departure_date: form.departure_date,
      passengers: String(form.passengers),
    });
    navigate(`/search?${params.toString()}`);
  }

  const panel = variant === "panel";
  return (
    <form
      onSubmit={submit}
      className={`${panel ? "card grid gap-4 p-6 shadow-pop sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr_auto]" : "grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"}`}
    >
      <Field label="From">
        <Select
          value={form.origin_city_id}
          onChange={(e) => setForm({ ...form, origin_city_id: e.target.value })}
          required
        >
          <option value="" disabled>
            Choose city
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="To">
        <Select
          value={form.destination_city_id}
          onChange={(e) => setForm({ ...form, destination_city_id: e.target.value })}
          required
        >
          <option value="" disabled>
            Choose city
          </option>
          {cities
            .filter((c) => c.id !== form.origin_city_id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </Field>
      <div className={panel ? "sm:col-span-2 lg:col-span-1" : ""}>
        <Field label="Departure date">
          <Input
            type="date"
            min={todayInputValue()}
            value={form.departure_date}
            onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
            required
          />
        </Field>
      </div>
      <Field label="Passengers">
        <Select
          value={form.passengers}
          onChange={(e) => setForm({ ...form, passengers: Number(e.target.value) })}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "passenger" : "passengers"}
            </option>
          ))}
        </Select>
      </Field>
      <div className={panel ? "flex items-end lg:col-span-4" : "flex items-end"}>
        <Button type="submit" size="lg" className="w-full">
          Search trips
        </Button>
      </div>
    </form>
  );
}

export function toTripQuery(p: SearchParams, extra?: Omit<TripSearchQuery, "origin_city_id" | "destination_city_id" | "departure_date" | "passengers">): TripSearchQuery {
  return { ...(extra ?? {}), ...p };
}