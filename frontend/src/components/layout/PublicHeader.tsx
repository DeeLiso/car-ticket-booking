import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Menu, X } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { initials } from "@/utils/format";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function PublicHeader({ transparent = false }: { transparent?: boolean }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.inert = !mobileOpen;
    if (!mobileOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointerDown = (e: Event) => {
      const target = e.target as Element | null;
      if (!target || headerRef.current?.contains(target)) return;
      setMobileOpen(false);
    };
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const onDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    const onPopState = () => setMobileOpen(false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    desktopQuery.addEventListener("change", onDesktop);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      desktopQuery.removeEventListener("change", onDesktop);
      window.removeEventListener("popstate", onPopState);
    };
  }, [mobileOpen]);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const desktopLink = (to: string) =>
    `inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors duration-200 ${
      isActive(to) ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
    }`;

  const mobileLink = (to: string) =>
    `inline-flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold transition-colors duration-200 ${
      isActive(to) ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
    }`;

  const links = [
    { to: "/search", label: t("layout.findTrips") },
    { to: "/about", label: t("layout.about") },
    { to: "/booking", label: t("layout.booking") },
  ];
  if (user?.role === "ADMIN") links.push({ to: "/admin", label: t("layout.adminPortal") });
  if (user?.role === "BUS_OPERATOR") links.push({ to: "/operator", label: t("layout.operatorPortal") });
  if (user?.role === "PASSENGER") links.push({ to: "/account", label: t("layout.myBookings") });

  const closeMenu = () => setMobileOpen(false);

  return (
    <header ref={headerRef} className="sticky top-0 z-40">
      <div className="container-app pt-4">
        <div
          className={`relative isolate rounded-2xl border border-white/10 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 ${
            scrolled
              ? "bg-navy-950/90 shadow-[0_24px_70px_-24px_rgba(2,6,23,0.95)]"
              : transparent
                ? "bg-navy-950/70 shadow-[0_18px_50px_-24px_rgba(2,6,23,0.75)]"
                : "bg-navy-950/85 shadow-[0_18px_50px_-24px_rgba(2,6,23,0.75)]"
          }`}
        >
          <div aria-hidden="true" className="navbar-aurora">
            <span className="aurora-blob aurora-blob--blue" />
            <span className="aurora-blob aurora-blob--violet" />
            <span className="aurora-blob aurora-blob--gold" />
            <span className="aurora-blob aurora-blob--cyan" />
            <span className="aurora-streak" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 sm:px-4 lg:px-5">
            <Logo imgClassName="h-8 sm:h-9" variant="light" className="shrink-0" />

            <nav
              aria-label={t("layout.primaryNavAriaLabel")}
              className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            >
              {links.map((link) => (
                <Link key={link.to} to={link.to} className={desktopLink(link.to)}>
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <ThemeToggle />
              <LanguageSwitcher />

              <div className="hidden items-center gap-2 lg:flex">
                <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
                {user ? (
                  <button
                    type="button"
                    onClick={() => navigate("/account")}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/5"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-2 ring-white/15">
                      {initials(user.full_name)}
                    </span>
                    <span className="max-w-[9rem] truncate">{user.full_name.split(" ")[0]}</span>
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/75 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                    >
                      {t("layout.signIn")}
                    </Link>
                    <Link
                      to="/register"
                      className="inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:bg-brand-500 hover:shadow-glow"
                    >
                      {t("layout.createAccount")}
                    </Link>
                  </>
                )}
              </div>

              <button
                ref={menuButtonRef}
                type="button"
                aria-label={mobileOpen ? t("layout.closeMenu") : t("layout.openMenu")}
                aria-expanded={mobileOpen}
                aria-controls="public-mobile-nav"
                onClick={() => setMobileOpen((v) => !v)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors duration-200 hover:bg-white/10 active:scale-95 lg:hidden"
              >
                <span className="relative h-5 w-5" aria-hidden="true">
                  <Menu
                    className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                      mobileOpen ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
                    }`}
                  />
                  <X
                    className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                      mobileOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <div
            ref={panelRef}
            id="public-mobile-nav"
            aria-hidden={!mobileOpen}
            className={`relative z-10 grid overflow-hidden rounded-b-2xl transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
              mobileOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0">
              <nav
                aria-label={t("layout.primaryNavAriaLabel")}
                className="flex flex-col gap-1 border-t border-white/10 px-3 pb-3 pt-2 sm:px-4"
              >
                {links.map((link) => (
                  <Link key={link.to} to={link.to} onClick={closeMenu} className={mobileLink(link.to)}>
                    <span>{link.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-50" aria-hidden="true" />
                  </Link>
                ))}

                <div className="mt-2 border-t border-white/10 pt-2">
                  {user ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigate("/account");
                      }}
                      className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-white/80 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-2 ring-white/15">
                        {initials(user.full_name)}
                      </span>
                      <span className="flex-1 truncate">{user.full_name}</span>
                      <ChevronRight className="h-4 w-4 opacity-50" aria-hidden="true" />
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition duration-200 hover:bg-white/10"
                      >
                        {t("layout.signIn")}
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeMenu}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-white/15 transition duration-200 hover:bg-brand-500"
                      >
                        {t("layout.createAccount")}
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
