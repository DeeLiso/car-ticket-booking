import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, ScanLine, Settings, Wallet, Wrench, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";

interface Shortcut {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Quick-menu panel that floats above the bottom nav's center action button.
 * Closes on outside click, on Escape (returning focus to the trigger),
 * and on route change.
 */
export function QuickMenu({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastPath = useRef(pathname);

  const canScan = user?.role === "BUS_OPERATOR" || user?.role === "ADMIN";
  const shortcuts: Shortcut[] = [
    { to: "/account/payments", label: "layout.wallet", icon: Wallet },
    { to: "/booking", label: "layout.services", icon: Wrench },
    canScan
      ? { to: "/operator/scan", label: "layout.scan", icon: ScanLine }
      : { to: "/calendar", label: "layout.calendar", icon: CalendarDays },
    { to: "/account/settings", label: "layout.settings", icon: Settings },
  ];

  // Close whenever the route changes (menu links, back button, guards).
  useEffect(() => {
    if (lastPath.current !== pathname) onClose();
    lastPath.current = pathname;
  }, [pathname, onClose]);

  // Keyboard: Escape closes and returns focus to the center button.
  // Pointer: clicks outside the panel (and not on the trigger) close it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      document.getElementById("quick-menu-trigger")?.focus();
    };
    const onPointerDown = (e: Event) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest?.("[data-quick-menu-trigger]")) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [onClose]);

  // Move focus into the menu for keyboard/screen-reader users.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, []);

  return (
    <div className="absolute bottom-full left-1/2 z-30 mb-9 w-[min(88vw,340px)] -translate-x-1/2">
      <div
        ref={panelRef}
        id="quick-menu"
        role="menu"
        aria-label={t("layout.quickMenuAriaLabel")}
        className="quick-menu-pop rounded-3xl border border-navy-100/80 bg-white/[0.94] p-2.5 shadow-pop backdrop-blur-2xl dark:border-white/10 dark:bg-[#111a2e]/95"
      >
        <div className="grid grid-cols-4 gap-1">
          {shortcuts.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              onClick={onClose}
              className="group flex flex-col items-center gap-1.5 rounded-2xl px-0.5 py-2.5 text-navy-500 transition duration-150 hover:bg-brand-50 hover:text-brand-600 active:scale-95 dark:text-navy-300 dark:hover:bg-white/5 dark:hover:text-brand-300"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white text-brand-600 shadow-sm transition group-hover:border-brand-200 group-hover:shadow-md dark:border-white/10 dark:from-white/10 dark:to-white/[0.03] dark:text-brand-300">
                <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="text-[10px] font-semibold leading-none">{t(label)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
