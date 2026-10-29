import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CityOut } from "@/types";

/**
 * Frosted-glass city combobox — a custom replacement for a native <select>.
 * Fully keyboard operable (Arrow keys, Enter, Escape) with a built-in filter.
 */
export function CitySelect({
  id,
  cities,
  value,
  onChange,
  placeholder,
  disabled = false,
  ariaLabel,
}: {
  id?: string;
  cities: CityOut[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  const uid = useId();
  const triggerId = id ?? `${uid}-trigger`;
  const listboxId = `${uid}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => cities.find((c) => c.id === value) ?? null, [cities, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.region ?? "").toLowerCase().includes(q),
    );
  }, [cities, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setQuery("");
    setHighlight(Math.max(0, cities.findIndex((c) => c.id === value)));
    setOpen(true);
  }

  function choose(city: CityOut) {
    onChange(city.id);
    setOpen(false);
  }

  function move(next: number) {
    if (filtered.length === 0) return;
    const clamped = Math.max(0, Math.min(next, filtered.length - 1));
    setHighlight(clamped);
    const target = filtered[clamped];
    if (target) document.getElementById(`${uid}-opt-${target.id}`)?.scrollIntoView({ block: "nearest" });
  }

  const activeId = open && filtered[highlight] ? `${uid}-opt-${filtered[highlight].id}` : undefined;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={triggerId}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) openMenu();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_24px_-18px_rgba(15,27,56,0.6)] backdrop-blur-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#e9eefb] dark:shadow-none ${
          open
            ? "border-brand-400/70 bg-white/75 ring-2 ring-brand-500/25 dark:border-brand-400/60 dark:bg-white/10"
            : "border-white/70 bg-white/55 hover:bg-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
          <span className={`truncate ${selected ? "" : "text-ink/45 dark:text-white/40"}`}>
            {selected ? selected.name : placeholder ?? t("forms.chooseCity")}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-navy-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 z-40 mt-2 w-full min-w-[15rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-white/45 shadow-pop backdrop-blur-2xl motion-safe:animate-cal-pop dark:border-white/10 dark:from-white/[0.1] dark:to-white/[0.03]"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              move(highlight + 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(highlight - 1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const city = filtered[highlight];
              if (city) choose(city);
            }
          }}
        >
          <div className="relative p-2 pb-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400 dark:text-white/40" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              placeholder={t("forms.searchCities")}
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              aria-label={ariaLabel ? t("forms.searchCitiesFor", { label: ariaLabel }) : t("forms.searchCities")}
              className="h-9 w-full rounded-lg border border-white/60 bg-white/60 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
            />
          </div>

          {/* A subtle divider keeps the filter clearly separate from the options */}
          <div className="mx-2 border-t border-white/50 dark:border-white/10" />

          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-60 overflow-y-auto p-2 pt-1.5"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-navy-400 dark:text-white/50">
                {t("forms.noCities")}
              </p>
            ) : (
              filtered.map((city, index) => {
                const isSelected = city.id === value;
                const isActive = index === highlight;
                return (
                  <button
                    key={city.id}
                    id={`${uid}-opt-${city.id}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(city)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-brand-500/15 text-brand-700 dark:bg-brand-500/25 dark:text-white"
                        : "text-navy-700 hover:bg-white/70 dark:text-[#c6d3ec] dark:hover:bg-white/10"
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-300" />
                    <span className="min-w-0 flex-1 truncate font-medium">{city.name}</span>
                    {city.region && (
                      <span className="shrink-0 text-xs text-navy-400 dark:text-white/40">
                        {city.region}
                      </span>
                    )}
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
