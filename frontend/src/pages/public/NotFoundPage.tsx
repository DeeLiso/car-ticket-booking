import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/layout/PageHero";

export function NotFoundPage() {
  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />
      <PageHero className="-mt-16 pb-28 pt-32">
        <div className="container-app flex flex-col items-center text-center">
          <p className="font-display text-7xl font-extrabold text-white/20">404</p>
          <h1 className="mt-4 font-display text-2xl font-extrabold">This road ends here</h1>
          <p className="mt-2 max-w-md text-navy-200">
            The page you’re looking for doesn’t exist or has moved.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Back to home
          </Link>
        </div>
      </PageHero>
      <Footer />
    </div>
  );
}