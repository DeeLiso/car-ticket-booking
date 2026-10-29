import { useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SeatMapResponse, SeatStatus, SeatStatusValue } from "@/types";
import { fmtMoney } from "@/utils/format";

interface Props {
  map: SeatMapResponse;
  selected: Set<string>;
  maxSelect: number;
  onToggle: (seat: SeatStatus) => void;
  readOnly?: boolean;
}

interface SeatLook {
  cls: string;
}

function seatLook(s: SeatStatus, selected: Set<string>): SeatLook {
  const taken = s.status !== "AVAILABLE";
  if (!taken && selected.has(s.seat_id))
    return {
      cls: "border border-cyan-400 bg-cyan-500 font-semibold text-slate-950 shadow-lg shadow-cyan-500/40",
    };
  if (!taken && s.category === "VIP")
    return {
      cls: "border border-amber-500/40 bg-amber-950/30 text-amber-400 hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]",
    };
  if (!taken)
    return {
      cls: "border border-emerald-500/30 bg-slate-900/80 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]",
    };
  return {
    cls: "border border-slate-800 bg-slate-900/40 text-slate-600 opacity-50",
  };
}

const TILE = 54;

function EmptyTile({ children }: { children?: ReactNode }) {
  return (
    <span
      className="iso-tile flex items-center justify-center rounded-lg"
      style={{ width: TILE, height: TILE }}
    >
      {children}
    </span>
  );
}

function SeatTile({
  seat,
  selected,
  maxSelect,
  onToggle,
  readOnly,
  onHover,
  onLeave,
}: {
  seat: SeatStatus;
  selected: Set<string>;
  maxSelect: number;
  onToggle: (seat: SeatStatus) => void;
  readOnly?: boolean;
  onHover: (seat: SeatStatus, e: ReactMouseEvent<HTMLButtonElement>) => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const unavailable = readOnly || seat.status !== "AVAILABLE";
  const overLimit = !readOnly && !selected.has(seat.seat_id) && selected.size >= maxSelect;
  const locked = !readOnly && (seat.status !== "AVAILABLE" || overLimit);
  const isSelected = selected.has(seat.seat_id);
  const look = seatLook(seat, selected);

  return (
    <EmptyTile>
      <button
        type="button"
        disabled={locked}
        aria-disabled={unavailable || overLimit}
        title={`${seat.seat_number} · ${t(`seats.category.${seat.category.toLowerCase()}`, seat.category)} · ${fmtMoney(seat.price)}`}
        aria-pressed={isSelected}
        onClick={() => {
          if (unavailable || overLimit) return;
          onToggle(seat);
        }}
        onMouseEnter={(e) => onHover(seat, e)}
        onMouseLeave={onLeave}
        className={`iso-seat group relative flex items-center justify-center rounded-lg border text-[10px] font-extrabold disabled:cursor-not-allowed ${readOnly ? "cursor-default" : "cursor-pointer"} ${look.cls} ${overLimit ? "opacity-30" : ""}`}
        style={{ width: TILE, height: TILE }}
      >
        <span className="iso-inner pointer-events-none flex flex-col items-center justify-center gap-0.5">
          <span className="flex items-baseline gap-1 leading-none">
            <span>{seat.seat_number}</span>
            {seat.is_accessible && <span aria-hidden="true">♿</span>}
          </span>
          <span className="opacity-80">{fmtMoney(seat.price)}</span>
        </span>
      </button>
    </EmptyTile>
  );
}

export function SeatMap({ map, selected, maxSelect, onToggle, readOnly }: Props) {
  const { t } = useTranslation();
  const [legendOpen, setLegendOpen] = useState(readOnly);
  const [tip, setTip] = useState<{ label: string; left: number; top: number } | null>(null);
  const rows: SeatStatus[][] = [];
  for (const seat of map.seats) {
    rows[seat.row_index] = rows[seat.row_index] ?? [];
    rows[seat.row_index]![seat.col_index] = seat;
  }

  const maxCol = Math.max(0, ...map.seats.map((s) => s.col_index));

  const showTip = (seat: SeatStatus, e: ReactMouseEvent<HTMLButtonElement>) => {
    const root = e.currentTarget.closest("[data-seatmap]");
    const er = e.currentTarget.getBoundingClientRect();
    const rr = root?.getBoundingClientRect();
    if (!rr) return;
    setTip({
      label: `${seat.seat_number} · ${fmtMoney(seat.price)}`,
      left: er.left + er.width / 2 - rr.left,
      top: er.top - rr.top,
    });
  };
  const hideTip = () => setTip(null);

  return (
    <div data-seatmap className="relative">
      <div className="mx-auto mb-4 max-w-md rounded-full bg-navy-50 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-navy-500 dark:bg-white/5 dark:text-navy-300">
        {t("seats.driver")}
      </div>

      <div className="overflow-x-auto seat-scroll pb-2 text-center -mx-2 px-2 sm:mx-0 sm:px-0">
        <div className="iso-stage mx-auto w-max">
          <div className="iso-bus">
            <div className="iso-floor p-3">
              <div className="flex flex-col gap-1.5">
                {rows.map((row, r) => (
                  <div key={r} className="flex gap-1.5">
                    {Array.from({ length: maxCol + 1 }, (_, c) => {
                      if (map.aisle_after_col && c === map.aisle_after_col) {
                        return (
                          <EmptyTile key={`aisle-${r}-${c}`}>
                            <span className="iso-inner flex h-full w-full items-center justify-center opacity-50">
                              <span className="block h-full w-0 border-l-2 border-dashed border-navy-400" />
                            </span>
                          </EmptyTile>
                        );
                      }
                      const seat = row?.[c];
                      if (!seat) return <EmptyTile key={`empty-${r}-${c}`} />;
                      return (
                        <SeatTile
                          key={seat.seat_id}
                          seat={seat}
                          selected={selected}
                          maxSelect={maxSelect}
                          onToggle={onToggle}
                          readOnly={readOnly}
                          onHover={showTip}
                          onLeave={hideTip}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {tip && (
        <span
          role="status"
          className="pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-navy-900 px-2 py-1 text-[11px] font-semibold text-white shadow-pop"
          style={{ left: tip.left, top: tip.top, transform: "translate(-50%, -110%)" }}
        >
          {tip.label}
        </span>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-navy-600 dark:text-navy-300">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-900/80 border border-emerald-500/30" /> {t("seats.legend.available")}</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-amber-950/30 border border-amber-500/40" /> {t("seats.legend.vip")}</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-cyan-500" /> {t("seats.legend.selected")}</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-900/40 border border-slate-700 opacity-60" /> {t("seats.legend.pending")}</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-900/40 border border-slate-800" /> {t("seats.legend.booked")}</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-900/40 border border-slate-800 opacity-50" /> {t("seats.legend.blocked")}</span>
      </div>

      <p className="mt-3 text-center text-xs text-navy-400 dark:text-navy-400">
        {t("seats.hint")}
      </p>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setLegendOpen(!legendOpen)}
          className="-my-2 inline-flex min-h-11 items-center px-2 font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
        >
          {legendOpen ? t("seats.hideLegend") : t("seats.showLegend")}
        </button>
      </div>

      {legendOpen && (
        <div className="mt-3 grid gap-1 rounded-2xl border border-navy-100 bg-navy-50/60 p-4 text-sm sm:grid-cols-2">
          {map.seats.map((s) => (
            <span key={s.seat_id} className="flex items-center justify-between border-b border-navy-100 py-1">
              <span className="font-semibold text-navy-800">{s.seat_number}</span>
              <span className="flex items-center gap-3 text-xs text-navy-500">
                {t(`seats.category.${s.category.toLowerCase()}`, s.category)} · {fmtMoney(s.price)}
                {s.is_accessible && <span title={t("seats.accessible")}>♿</span>}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function seatStatusBadge(v: SeatStatusValue): string {
  return v === "AVAILABLE" ? "Available" : v === "RESERVED" ? "Reserved" : v === "SOLD" ? "Sold" : "Blocked";
}