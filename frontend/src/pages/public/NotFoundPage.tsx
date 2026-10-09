import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";

export function NotFoundPage() {
  return (
    <div id="main" tabIndex={-1} className="min-h-screen outline-none">
      <PublicHeader />
      <div className="container-app flex flex-col items-center justify-center py-28 text-center">
        <p className="font-display text-7xl font-extrabold text-brand-200">404</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-navy-900">This road ends here</h1>
        <p className="mt-2 max-w-md text-navy-500">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Back to home
        </Link>
      </div>
      <Footer />
    </div>
  );
}