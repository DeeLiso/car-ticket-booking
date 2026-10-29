export function fmtMoney(n: number | string | undefined | null, currency = "MMK"): string {
  const v = Number(n ?? 0);
  if (currency === "MMK") return `K ${Math.round(v).toLocaleString("en-US")}`;
  return `${v.toLocaleString("en-US")} ${currency}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Epoch time for a backend timestamp. Timestamps like `created_at` are stored as
 * naive UTC ("2026-10-13T18:28:48"); JS would otherwise read that as local time,
 * so force UTC when the string carries no offset.
 */
export function apiTime(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasOffset ? iso : `${iso}Z`).getTime();
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function mmkToNumber(mmk: string): number {
  const v = Number(mmk.replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

export function durationText(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function todayInputValue(date = new Date()): string {
  const off = date.getTimezoneOffset();
  const local = new Date(date.getTime() - off * 60_000);
  return local.toISOString().slice(0, 10);
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}