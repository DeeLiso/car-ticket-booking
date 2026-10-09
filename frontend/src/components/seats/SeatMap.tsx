import { useState } from "react";
import type { SeatMapResponse, SeatStatus, SeatStatusValue } from "@/types";
import { fmtMoney, titleCase } from "@/utils/format";

interface Props {
  map: SeatMapResponse;
  selected: Set<string>;
  maxSelect: number;
  onToggle: (seat: SeatStatus) => void;
  readOnly?: boolean;
}

function seatClass(s: SeatStatus, selected: Set<string>, readOnly?: boolean): string {
  if (readOnly || s.status !== "AVAILABLE") {
    if (s.status === "AVAILABLE") return "bg-emerald-50 text-emerald-700 border-emerald-300";
    if (s.status === "RESERVED") return "bg-amber-100 text-amber-600 border-amber-200";
    if (s.status === "SOLD") return "bg-red-100 text-red-500 border-red-200";
    return "bg-slate-100 text-slate-400 border-slate-200";
  }
  if (selected.has(s.seat_id))
    return "bg-brand-600 text-white border-brand-700 shadow-glow scale-105";
  if (s.category === "VIP") return "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700";
  return "bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100";
}

export function SeatMap({ map, selected, maxSelect, onToggle, readOnly }: Props) {
  const [legendOpen, setLegendOpen] = useState(readOnly);
  const rows: SeatStatus[][] = [];
  for (const seat of map.seats) {
    rows[seat.row_index] = rows[seat.row_index] ?? [];
    rows[seat.row_index]![seat.col_index] = seat;
  }

  const maxCol = Math.max(0, ...map.seats.map((s) => s.col_index));

  return (
    <div>
      <div className="mx-auto mb-5 max-w-md rounded-full bg-navy-50 py-2 text-center text-xs font-semibold uppercase tracking-widest text-navy-500">
        ══ Driver ══
      </div>
      <div className="overflow-x-auto seat-scroll">
        <div
          className="mx-auto grid gap-1.5 p-4"
          style={{ minWidth: `${(maxCol + 1) * 56}px` }}
        >
          {rows.map((row, r) => (
            <div key={r} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${maxCol + 1}, 48px)` }}>
              {Array.from({ length: maxCol + 1 }, (_, c) => {
                const seat = row?.[c];
                if (!seat) return <span key={`${r}-${c}`} className="h-10" />;
                if (map.aisle_after_col && c === map.aisle_after_col) {
                  return <span key={`${r}-${c}`} className="w-6" />;
                }
                const disabled = readOnly || seat.status !== "AVAILABLE";
                const overLimit = !disabled && !selected.has(seat.seat_id) && selected.size >= maxSelect;
                const isSelected = selected.has(seat.seat_id);
                return (
                  <button
                    key={seat.seat_id}
                    type="button"
                    disabled={disabled || overLimit}
                    title={`${seat.seat_number} · ${titleCase(seat.category)} · ${fmtMoney(seat.price)}`}
                    onClick={() => onToggle(seat)}
                    className={`seat-btn h-10 rounded-lg border text-[10px] font-bold disabled:cursor-not-allowed ${seatClass(seat, selected, readOnly)} ${isSelected ? "animate-pulse-ring" : ""} ${overLimit ? "opacity-30" : ""}`}
                  >
                    {seat.seat_number}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-navy-600">
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-50 border border-emerald-300" /> Available</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-emerald-600" /> VIP</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-brand-600" /> Selected</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-amber-100 border border-amber-200" /> Pending</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-red-100 border border-red-200" /> Booked</span>
        <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded bg-slate-200" /> Blocked</span>
        {!readOnly && (
          <button type="button" onClick={() => setLegendOpen(!legendOpen)} className="font-semibold text-brand-700 underline-offset-2 hover:underline">
            {legendOpen ? "Hide legend" : "Show legend"}
          </button>
        )}
      </div>
      {legendOpen && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-navy-100 bg-navy-50/60 p-4 text-sm sm:grid-cols-2">
          {map.seats.map((s) => (
            <span key={s.seat_id} className="flex items-center justify-between border-b border-navy-100 py-1">
              <span className="font-semibold text-navy-800">{s.seat_number}</span>
              <span className="flex items-center gap-3 text-xs text-navy-500">
                {titleCase(s.category)} · {fmtMoney(s.price)}
                {s.is_accessible && <span title="Accessible">♿</span>}
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
