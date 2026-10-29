/** Shared input/button class strings for the calendar modals (theme-aware). */

export function fieldClass(dark: boolean): string {
  const base =
    "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2";
  return dark
    ? `${base} border-[#2a3a5c] bg-[#0f1830] text-[#e9eefb] placeholder:text-[#5e7195] focus:border-brand-500 focus:ring-brand-500/25`
    : `${base} border-navy-200 bg-white text-ink placeholder:text-ink/40 focus:border-brand-600 focus:ring-brand-600/20`;
}

export function labelClass(dark: boolean): string {
  return `mb-1.5 block text-sm font-medium ${dark ? "text-[#a8b9da]" : "text-ink/75"}`;
}

export function secondaryBtnClass(dark: boolean): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] focus:outline-none focus-visible:ring-2";
  return dark
    ? `${base} border border-[#2a3a5c] text-[#c6d3ec] hover:bg-white/10`
    : `${base} border border-navy-200 text-navy-700 hover:bg-navy-50`;
}

export function dangerBtnClass(): string {
  return "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
}
