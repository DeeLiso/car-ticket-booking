import { Link } from "react-router-dom";
import { APP_NAME, SUPPORT_PHONE } from "@/config";

export function Footer() {
  return (
    <footer className="mt-16 bg-navy-950 text-navy-100">
      <div className="container-app grid gap-8 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal-fade text-sm font-black text-white">
              T
            </span>
            TikeSho
          </p>
          <p className="mt-3 text-sm leading-relaxed text-navy-300">
            Premium car & bus ticketing across Myanmar. Book in minutes, travel with confidence.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-navy-300">
            <li>About us</li>
            <li>Careers</li>
            <li>Press</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">Support</p>
          <ul className="mt-3 space-y-2 text-sm text-navy-300">
            <li><a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="hover:text-white">{SUPPORT_PHONE}</a></li>
            <li>help@tikesho.mm</li>
            <li>FAQ</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">For partners</p>
          <ul className="mt-3 space-y-2 text-sm text-navy-300">
            <li>Become an operator</li>
            <li>
              <Link to="/login" className="hover:text-white">Operator login</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-navy-400">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
