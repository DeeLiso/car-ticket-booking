import { APP_VERSION } from "@/config";

/** Subtle fixed version chip — visible on every page, mobile & desktop.
 *  Positioned above the mobile bottom nav; sits in the corner on desktop.
 *  Pointer-events none so it never blocks interaction. */
export function VersionBadge() {
  return (
    <div
      className="pointer-events-none fixed bottom-20 left-2 z-40 select-none rounded-full border border-white/10 bg-navy-900/60 px-2 py-0.5 font-body text-[10px] font-medium tracking-wide text-navy-300/70 backdrop-blur-sm lg:bottom-4 lg:left-4 dark:border-white/10 dark:bg-white/5 dark:text-white/40"
      aria-hidden="true"
    >
      v{APP_VERSION}
    </div>
  );
}
