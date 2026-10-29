import { useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { CircleUserRound, House, LayoutGrid, MessageCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QuickMenu } from "@/components/layout/QuickMenu";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: boolean;
  scrollTopOnNav?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "nav.home", icon: House, end: true, scrollTopOnNav: true },
  { to: "/search", label: "nav.discover", icon: Sparkles },
  { to: "/account/notifications", label: "nav.messages", icon: MessageCircle, badge: true },
  { to: "/account/profile", label: "nav.profile", icon: CircleUserRound },
];

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
}

function NavItemLink({ item, unread }: { item: NavItem; unread: number }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  const showBadge = item.badge && unread > 0;

  return (
    <li className="relative min-w-0">
      <NavLink
        to={item.to}
        end={item.end}
        onClick={item.scrollTopOnNav ? scrollToTop : undefined}
        className={({ isActive }) =>
          `group flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition duration-200 active:scale-90 ${
            isActive
              ? "text-[#1677ff] dark:text-[#5b93ff]"
              : "text-navy-500 hover:text-navy-700 dark:hover:text-navy-200"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className="relative flex h-7 items-center justify-center">
              <Icon
                className={`h-[23px] w-[23px] transition-transform duration-200 ${
                  isActive ? "scale-110" : "group-active:scale-90"
                }`}
                strokeWidth={isActive ? 2.1 : 1.8}
                aria-hidden="true"
              />
              {showBadge && (
                <span
                  className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full border-2 border-white bg-red-500 px-1 text-center text-[9px] font-bold leading-[14px] text-white shadow-sm dark:border-[#111a2e]"
                  aria-label={`${unread} unread notifications`}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold leading-none">{t(item.label)}</span>
            <span
              aria-hidden="true"
              className={`h-1 w-4 rounded-full bg-[#1677ff] transition-all duration-300 dark:bg-[#5b93ff] ${
                isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
              }`}
            />
          </>
        )}
      </NavLink>
    </li>
  );
}

export function BottomNav({ messageCount }: { messageCount?: number } = {}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const unread = useUnreadMessages();
  const count = messageCount ?? unread;

  const centerIndex = 2;

  return (
    <nav aria-label={t("layout.primaryNavAriaLabel")} className="bottom-nav-anim fixed inset-x-0 bottom-0 z-[1000] lg:hidden">
      <div className="relative mx-auto w-full max-w-md">
        {menuOpen && <QuickMenu onClose={closeMenu} />}
        <ul className="grid grid-cols-5 items-stretch gap-0.5 rounded-t-3xl border-t border-navy-100/80 bg-white/[0.78] px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(15,23,42,0.10)] backdrop-blur-[20px] dark:border-white/10 dark:bg-[#111a2e]/85">
          {NAV_ITEMS.slice(0, centerIndex).map((item) => (
            <NavItemLink key={item.to} item={item} unread={count} />
          ))}
          <CenterAction open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
          {NAV_ITEMS.slice(centerIndex).map((item) => (
            <NavItemLink key={item.to} item={item} unread={count} />
          ))}
        </ul>
      </div>
    </nav>
  );
}

function CenterAction({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <li className="relative flex min-w-0 items-end justify-center">
      <span className="absolute -top-7 left-1/2 z-20 -translate-x-1/2">
        <span className="fab-float block">
          <button
            type="button"
            id="quick-menu-trigger"
            data-quick-menu-trigger
            aria-label={open ? t("layout.closeQuickMenu") : t("layout.openQuickMenu")}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls="quick-menu"
            onClick={onToggle}
            className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#1677ff,#003cff)] text-white shadow-[0_6px_20px_rgba(0,75,255,0.35)] transition duration-200 hover:-translate-y-[3px] hover:scale-[1.04] active:scale-[0.95] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#1677ff]/40"
          >
            <LayoutGrid className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
          </button>
        </span>
      </span>
    </li>
  );
}
