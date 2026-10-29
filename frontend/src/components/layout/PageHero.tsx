import type { ReactNode } from "react";

/**
 * Dark, hero-coloured band used at the top of a page. Matches the landing hero:
 * `bg-hero-fade` gradient with a faint grid overlay and orange/brand glows.
 * Callers control spacing/layout via `className` and wrap their content.
 */
export function PageHero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden bg-hero-fade text-white ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero-grid" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-brand-500/25 blur-[110px]"
      />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
