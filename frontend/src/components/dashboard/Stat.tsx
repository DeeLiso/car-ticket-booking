import { useId, useMemo, useState } from "react";

export interface StatDef {
  label: string;
  value: string | number;
  accent?: boolean;
  icon?: string;
  hint?: string;
}

export function StatCard({ label, value, accent, icon, hint }: StatDef) {
  return (
    <div
      className={`card relative overflow-hidden p-5 ${
        accent ? "border-transparent bg-navy-fade text-white shadow-glow" : ""
      }`}
    >
      {accent && (
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/25 blur-2xl" />
      )}
      <div className="relative flex items-start justify-between">
        <p className={`text-sm font-medium ${accent ? "text-navy-200" : "text-navy-500"}`}>{label}</p>
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
              accent ? "bg-white/10 text-white" : "bg-navy-50 text-navy-500"
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        className={`relative mt-2 font-display text-3xl font-extrabold tracking-tight ${
          accent ? "text-white" : "text-navy-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className={`relative mt-1 text-xs ${accent ? "text-navy-300" : "text-navy-400"}`}>{hint}</p>}
    </div>
  );
}

const PALETTE = ["#2445e0", "#3b62ef", "#e58f10", "#0ea472", "#7c3aed", "#db2777"];

/** Interactive smooth area/line chart with hover tooltip. */
export function AreaChart({
  data,
  height = 200,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = 640;
  const padX = 24;
  const padY = 20;

  const { points, path, area, coords } = useMemo(() => {
    const values = data.map((d) => d.value);
    const maxV = Math.max(1, ...values);
    const stepX = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
    const c = data.map((d, i) => {
      const x = padX + i * stepX;
      const y = height - padY - (d.value / maxV) * (height - padY * 2);
      return { x, y, ...d };
    });
    const line = c.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = c.length
      ? `${line} L${c[c.length - 1]!.x},${height - padY} L${c[0]!.x},${height - padY} Z`
      : "";
    return { points: values, path: line, area: areaPath, coords: c };
  }, [data, height]);

  if (!data.length) return <p className="py-10 text-center text-sm text-navy-400">No data yet.</p>;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2445e0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2445e0" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + (height - padY * 2) * (1 - f)}
            y2={padY + (height - padY * 2) * (1 - f)}
            stroke="#e4e9f2"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke="#2445e0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - (width - padX * 2) / (data.length * 2)}
              y={0}
              width={(width - padX * 2) / data.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {(hover === i || data.length === 1) && (
              <>
                <line x1={p.x} x2={p.x} y1={padY} y2={height - padY} stroke="#2445e0" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#2445e0" strokeWidth="2.5" />
              </>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && coords[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-pop"
          style={{ left: `${(coords[hover]!.x / width) * 100}%`, top: 0 }}
        >
          <span className="block font-semibold">{coords[hover]!.label}</span>
          <span className="text-navy-200">{formatValue(points[hover]!)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-navy-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** Interactive donut chart with hover highlight + legend. */
export function DonutChart({
  data,
  size = 180,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  data: { name: string; value: number }[];
  size?: number;
  formatValue?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const radius = size / 2;
  const stroke = 22;
  const r = radius - stroke / 2;
  const circumference = 2 * Math.PI * r;

  if (!data.length) return <p className="py-10 text-center text-sm text-navy-400">No data yet.</p>;

  const segments = data.map((d, i) => {
    const fraction = d.value / total;
    const offset = data.slice(0, i).reduce((sum, prev) => sum + prev.value / total, 0);
    return { ...d, fraction, offset, color: PALETTE[i % PALETTE.length]! };
  });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={radius} cy={radius} r={r} fill="none" stroke="#e4e9f2" strokeWidth={stroke} />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={radius}
              cy={radius}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              strokeDasharray={`${s.fraction * circumference} ${circumference}`}
              strokeDashoffset={-s.offset * circumference}
              strokeLinecap="butt"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-extrabold text-navy-900">
            {hover !== null ? `${Math.round(segments[hover]!.fraction * 100)}%` : formatValue(total)}
          </span>
          <span className="max-w-[80%] truncate text-xs text-navy-400">
            {hover !== null ? segments[hover]!.name : "Total"}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {segments.map((s, i) => (
          <li
            key={i}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm transition hover:bg-navy-50"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-navy-700">{s.name}</span>
            <span className="font-semibold text-navy-900">{formatValue(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Interactive horizontal bar list. */
export function BarList({
  data,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  data: { name: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  if (!data.length) return <p className="py-10 text-center text-sm text-navy-400">No data yet.</p>;
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.name} className="group">
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium text-navy-600">{d.name}</span>
            <span className="font-semibold text-navy-900">{formatValue(d.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy-100">
            <div
              className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
              style={{ width: `${Math.max(3, (Math.abs(d.value) / max) * 100)}%`, background: PALETTE[i % PALETTE.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
