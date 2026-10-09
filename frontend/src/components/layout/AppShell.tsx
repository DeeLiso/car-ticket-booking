import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { initials } from "@/utils/format";

interface NavItem {
  to: string;
  label: string;
  section?: string;
}

function navFor(role: string): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        { to: "/admin", label: "Dashboard" },
        { to: "/admin/operators", label: "Operators" },
        { to: "/admin/routes", label: "Routes" },
        { to: "/admin/buses", label: "Buses" },
        { to: "/admin/trips", label: "Trips" },
        { to: "/admin/refunds", label: "Refunds" },
        { to: "/admin/audit", label: "Audit logs" },
      ];
    case "BUS_OPERATOR":
      return [
        { to: "/operator", label: "Dashboard" },
        { to: "/operator/buses", label: "My buses" },
        { to: "/operator/trips", label: "My trips" },
        { to: "/operator/scan", label: "Scan ticket" },
      ];
    default:
      return [
        { to: "/account", label: "My bookings" },
        { to: "/account/tickets", label: "My tickets" },
      ];
  }
}

function RoleBadge({ role }: { role: string }) {
  const label = role === "ADMIN" ? "Admin" : role === "BUS_OPERATOR" ? "Operator" : "Passenger";
  return (
    <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-200">
      {label}
    </span>
  );
}

function SignOutButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);
  return (
    <button
      className={`text-sm font-medium text-navy-300 transition hover:text-white ${className}`}
      onClick={() => {
        clearSession();
        navigate("/login");
      }}
    >
      Sign out
    </button>
  );
}

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const role = user?.role ?? "PASSENGER";
  const items = navFor(role);

  return (
    <div className="min-h-screen bg-navy-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-navy-950 lg:flex">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-6 py-5 font-display text-lg font-extrabold text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal-fade text-sm font-black text-white shadow-glow">
            T
          </span>
          TikeSho
        </button>
        <p className="px-6 pb-3 text-[11px] font-semibold uppercase tracking-widest text-navy-500">
          {role === "ADMIN" ? "Admin console" : role === "BUS_OPERATOR" ? "Operator" : "Account"}
        </p>
        <nav aria-label="Section" className="mt-1 flex-1 space-y-1 px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split("/").length === 2}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-600 text-white shadow-glow"
                    : "text-navy-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : "bg-navy-600 group-hover:bg-brand-400"}`}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials(user?.full_name ?? "?")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                {user?.full_name} <RoleBadge role={role} />
              </p>
              <p className="truncate text-xs text-navy-400">{user?.email}</p>
            </div>
          </div>
          <SignOutButton className="mt-3 inline-block" />
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="sticky top-0 z-40 bg-navy-950 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-royal-fade text-xs font-black text-white">
              T
            </span>
            TikeSho
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials(user?.full_name ?? "?")}
            </span>
            <SignOutButton />
          </div>
        </div>
        {/* Mobile horizontal nav */}
        <nav aria-label="Section" className="flex gap-1 overflow-x-auto px-3 pb-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split("/").length === 2}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive ? "bg-brand-600 text-white" : "bg-white/5 text-navy-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="outline-none lg:pl-64">
        <Outlet />
      </main>
    </div>
  );
}
