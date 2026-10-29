import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { catalogApi, type TripSearchQuery } from "@/services/endpoints";
import { todayInputValue } from "@/utils/format";
import { Button } from "@/components/common/Button";
import { Field } from "@/components/common/Field";
import { InlineError } from "@/components/common/Alert";
import { CitySelect } from "@/components/forms/CitySelect";
import { PassengerSelect } from "@/components/forms/PassengerSelect";
import { DateCalendarPicker } from "@/components/calendar/DateCalendarPicker";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const uid = useId();
  const originId = `${uid}-origin`;
  const destinationId = `${uid}-destination`;
  const passengersId = `${uid}-passengers`;
  const {
    data: cities = [],
    isLoading: citiesLoading,
    isError: citiesError,
    refetch: refetchCities,
  } = useQuery({ queryKey: ["cities"], queryFn: catalogApi.cities });
  const [form, setForm] = useState<SearchParams>({
    origin_city_id: initial.origin_city_id ?? "",
    destination_city_id: initial.destination_city_id ?? "",
    departure_date: initial.departure_date ?? todayInputValue(),
    passengers: initial.passengers ?? 1,
  });
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.origin_city_id) {
      setError(t("forms.originRequired"));
      return;
    }
    if (!form.destination_city_id) {
      setError(t("forms.destinationRequired"));
      return;
    }
    setError("");
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
  const span = panel ? "sm:col-span-2 lg:col-span-4" : "sm:col-span-4";
  const citiesDisabled = citiesLoading || citiesError;
  return (
    <form
      onSubmit={submit}
      className={`${panel ? "card grid gap-3 p-4 shadow-pop sm:gap-4 sm:p-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1.2fr_auto]" : "grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"}`}
    >
      {error && (
        <div className={span}>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}
      {citiesError && (
        <div className={span}>
          <InlineError
            message={t("forms.citiesError")}
            onRetry={() => refetchCities()}
          />
        </div>
      )}
      <div>
        <label htmlFor={originId} className="label">
          {t("forms.from")}
        </label>
        <CitySelect
          id={originId}
          ariaLabel={t("forms.fromCity")}
          cities={cities}
          value={form.origin_city_id}
          disabled={citiesDisabled}
          placeholder={citiesLoading ? t("forms.loadingCities") : t("forms.chooseCity")}
          onChange={(id) => {
            setError("");
            setForm((f) => ({
              ...f,
              origin_city_id: id,
              destination_city_id: f.destination_city_id === id ? "" : f.destination_city_id,
            }));
          }}
        />
      </div>
      <div>
        <label htmlFor={destinationId} className="label">
          {t("forms.to")}
        </label>
        <CitySelect
          id={destinationId}
          ariaLabel={t("forms.toCity")}
          cities={cities.filter((c) => c.id !== form.origin_city_id)}
          value={form.destination_city_id}
          disabled={citiesDisabled}
          placeholder={citiesLoading ? t("forms.loadingCities") : t("forms.chooseCity")}
          onChange={(id) => {
            setError("");
            setForm((f) => ({ ...f, destination_city_id: id }));
          }}
        />
      </div>
      <div className={panel ? "sm:col-span-2 lg:col-span-1" : ""}>
        <Field label={t("forms.departureDate")}>
          <DateCalendarPicker
            value={form.departure_date}
            min={todayInputValue()}
            onChange={(value) => setForm({ ...form, departure_date: value })}
          />
        </Field>
      </div>
      <div>
        <label htmlFor={passengersId} className="label">
          {t("forms.passengers")}
        </label>
        <PassengerSelect
          id={passengersId}
          ariaLabel={t("forms.passengers")}
          value={form.passengers}
          onChange={(value) => setForm((f) => ({ ...f, passengers: value }))}
        />
      </div>
      <div className={panel ? "flex items-end lg:col-span-4" : "flex items-end"}>
        <Button type="submit" size="lg" className="w-full">
          {t("forms.searchTrips")}
        </Button>
      </div>
    </form>
  );
}

export function toTripQuery(p: SearchParams, extra?: Omit<TripSearchQuery, "origin_city_id" | "destination_city_id" | "departure_date" | "passengers">): TripSearchQuery {
  return { ...(extra ?? {}), ...p };
}