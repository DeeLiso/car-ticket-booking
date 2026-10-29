import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { ProfileModal } from "@/components/layout/ProfileModal";
import { navFor, type NavGroup } from "@/components/layout/navConfig";
import { useBookingAlerts } from "@/hooks/useBookingAlerts";
import { meApi } from "@/services/endpoints";
import { initials } from "@/utils/format";

function NavLinks({
  groups,
  badges,
  variant,
  onNavigate,
}: {
  groups: NavGroup[];
  badges: Record<string, number>;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const isMobile = variant === "mobile";
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("layout.sectionAriaLabel")}
      className={
        isMobile
          ? "border-t border-white/10 px-3 pb-3 pt-2"
          : "mt-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-3"
      }
    >
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-navy-500">
            {t(group.title)}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const badge = badges[item.to] ?? 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to.split("/").length === 2}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                      isMobile ? "min-h-11" : "py-2.5"
                    } ${
                      isActive
                        ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow"
                        : "text-navy-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white/5 text-navy-400 group-hover:bg-brand-500/15 group-hover:text-brand-300"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{t(item.label)}</span>
                      {badge > 0 && (
                        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  const label =
    role === "ADMIN" ? t("profile.admin") : role === "BUS_OPERATOR" ? t("profile.operator") : t("profile.passenger");
  return (
    <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-200">
      {label}
    </span>
  );
}

function SignOutButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  const { t } = useTranslation();
  return (
    <button
      className={`text-sm font-medium text-navy-300 transition hover:text-white ${className}`}
      onClick={() => {
        clearSession();
        navigate("/login");
      }}
    >
      {t("layout.signOut")}
    </button>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const role = user?.role ?? "PASSENGER";
  const groups = navFor(role);
  const { newCount } = useBookingAlerts({ enabled: role === "ADMIN", sound: true });

  const notifications = useQuery({
    queryKey: ["me", "notifications"],
    queryFn: () => meApi.notifications(100),
    enabled: role === "PASSENGER",
    staleTime: 60_000,
  });

  const badges: Record<string, number> = {};
  if (role === "ADMIN" && newCount > 0) badges["/admin/bookings"] = newCount;
  if (role === "PASSENGER" && notifications.data) {
    const unread = notifications.data.filter((n) => !n.read_at).length;
    if (unread > 0) badges["/account/notifications"] = unread;
  }

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-navy-950 lg:flex">
        <Link to="/" className="flex items-center px-6 py-5 font-display text-lg font-extrabold text-white">
          T-M-T
        </Link>
        <p className="px-6 pb-3 text-[11px] font-semibold uppercase tracking-widest text-navy-500">
          {role === "ADMIN" ? t("layout.adminConsole") : role === "BUS_OPERATOR" ? t("layout.operator") : t("layout.account")}
        </p>
        <NavLinks groups={groups} badges={badges} variant="desktop" />
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-1.5">
            <span className="text-xs font-semibold text-navy-300">{t("layout.appearance")}</span>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={t("layout.editProfile")}
            className="group flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-white/5"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white ring-2 ring-white/10">
              {initials(user?.full_name ?? "?")}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-navy-800 text-navy-300 ring-2 ring-navy-950 transition group-hover:bg-brand-500 group-hover:text-white">
                <Pencil className="h-2.5 w-2.5" />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                {user?.full_name} <RoleBadge role={role} />
              </span>
              <span className="block truncate text-xs text-navy-400 transition group-hover:text-navy-300">
                {user?.email}
              </span>
            </span>
          </button>
          <div className="mt-2 flex items-center justify-between">
            <SignOutButton className="inline-block" />
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-navy-300 transition hover:text-white"
            >
              <Pencil className="h-3 w-3" />
              {t("layout.editProfile")}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 bg-navy-950 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo imgClassName="h-8" variant="light" />
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label={t("layout.editProfile")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white ring-2 ring-white/10 transition active:scale-95"
            >
              {initials(user?.full_name ?? "?")}
            </button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none lg:pl-64">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {profileOpen && (
        <ProfileModal open onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
