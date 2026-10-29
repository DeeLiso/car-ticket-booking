import type { ReactNode } from "react";
import { PageHero } from "@/components/layout/PageHero";

/** Base shimmer block — sized with width/height utilities by callers. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

/**
 * Page-level loading wrapper. Announces the loading state to assistive tech
 * (role="status" + screen-reader-only label) and optionally draws a title
 * skeleton so the layout doesn't jump when data arrives.
 */
export function SkeletonPage({
  label,
  header = true,
  actions = 0,
  children,
}: {
  label: string;
  header?: boolean;
  actions?: number;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" className="px-4 py-8 sm:px-8 lg:px-10">
      <span className="sr-only">{label}</span>
      {header && (
        <PageHero className="-mx-4 -mt-8 mb-6 sm:-mx-8 lg:-mx-10">
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-7 sm:px-8 lg:px-10">
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            {actions > 0 && (
              <div className="flex gap-2">
                {Array.from({ length: actions }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-32" />
                ))}
              </div>
            )}
          </div>
        </PageHero>
      )}
      {children}
    </div>
  );
}

/** Stack of card rows — bookings, trips, search results. */
export function ListSkeleton({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table skeleton matching the app's card-wrapped tables. */
export function TableSkeleton({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="flex gap-6 border-b border-navy-100 bg-navy-50 px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-6 border-b border-navy-50 px-5 py-3.5">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={`h-3 ${c === 0 ? "w-28" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Stat-card grid used by the admin/operator dashboards. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Chart card placeholder. */
export function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`card p-6 ${className}`} aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-5 h-40 w-full" />
    </div>
  );
}

/** Two-column detail page (ticket, booking) placeholder. */
export function DetailSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <SkeletonPage label={label} header={false}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-4 p-7">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="card space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </SkeletonPage>
  );
}
