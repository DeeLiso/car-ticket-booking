import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { initials } from "@/utils/format";

export function PublicHeader({ transparent = false }: { transparent?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const linkCls = transparent ? "text-white/85 hover:text-white" : "text-navy-700 hover:text-brand-700";

  return (
    <header className={`relative z-20 ${transparent ? "bg-transparent" : "sticky top-0 border-b border-navy-100 bg-white/90 backdrop-blur"}`}>
      <div className="container-app flex items-center justify-between py-3.5">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-navy-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-royal-fade text-base font-black text-white shadow-glow">
            T
          </span>
          TikeSho
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm font-medium">
          <Link to="/search" className={`hidden sm:inline ${linkCls}`}>
            Find trips
          </Link>
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link to="/admin" className={`hidden sm:inline ${linkCls}`}>
                  Admin portal
                </Link>
              )}
              {user.role === "BUS_OPERATOR" && (
                <Link to="/operator" className={`hidden sm:inline ${linkCls}`}>
                  Operator portal
                </Link>
              )}
              {user.role === "PASSENGER" && (
                <Link to="/account" className={`hidden sm:inline ${linkCls}`}>
                  My bookings
                </Link>
              )}
              <button onClick={() => navigate("/account")} className={`${linkCls} flex items-center gap-2`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {initials(user.full_name)}
                </span>
                <span className={`hidden sm:inline ${transparent ? "text-white" : "text-navy-900"}`}>
                  {user.full_name.split(" ")[0]}
                </span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={linkCls}>
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
