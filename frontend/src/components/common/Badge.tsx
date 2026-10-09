const palettes: Record<string, string> = {
  // Pending / in-progress — amber
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PROCESSING: "bg-amber-50 text-amber-700 border border-amber-200",
  REQUESTED: "bg-amber-50 text-amber-700 border border-amber-200",
  REFUND_PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  RESERVED: "bg-amber-50 text-amber-700 border border-amber-200",
  // Confirmed / available / success — green
  CONFIRMED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  SUCCEEDED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PROCESSED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  VALID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  AVAILABLE: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  BOOKED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  // Scheduled / informational — royal blue
  SCHEDULED: "bg-brand-50 text-brand-700 border border-brand-200",
  DEPARTED: "bg-brand-50 text-brand-700 border border-brand-200",
  BOARDING: "bg-brand-100 text-brand-800 border border-brand-200",
  // Refunded — violet
  REFUNDED: "bg-violet-50 text-violet-700 border border-violet-200",
  // Cancelled / failed / booked-out — red
  CANCELLED: "bg-red-50 text-red-600 border border-red-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  FAILED: "bg-red-50 text-red-600 border border-red-200",
  EXPIRED: "bg-red-50 text-red-600 border border-red-200",
  NOT_FOUND: "bg-red-50 text-red-600 border border-red-200",
  WRONG_TRIP: "bg-red-50 text-red-600 border border-red-200",
  SUSPENDED: "bg-red-50 text-red-600 border border-red-200",
  SOLD: "bg-red-50 text-red-600 border border-red-200",
  // Used / completed / blocked — neutral
  USED: "bg-navy-100 text-navy-600 border border-navy-200",
  COMPLETED: "bg-navy-100 text-navy-600 border border-navy-200",
  ALREADY_USED: "bg-navy-100 text-navy-600 border border-navy-200",
  BLOCKED: "bg-slate-100 text-slate-500 border border-slate-200",
};

export function Badge({ label }: { label: string }) {
  const clean = label?.toUpperCase() ?? "";
  const cls = palettes[clean] ?? "bg-navy-100 text-navy-600 border border-navy-200";
  return <span className={`badge ${cls}`}>{clean.replace(/_/g, " ")}</span>;
}
