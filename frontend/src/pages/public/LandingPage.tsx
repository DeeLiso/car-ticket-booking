import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchForm } from "@/components/forms/SearchForm";
import { catalogApi } from "@/services/endpoints";
import { initials } from "@/utils/format";

const FEATURES = [
  {
    icon: "🧭",
    title: "Live availability",
    text: "Seat-level inventory backed by atomic holds — no overselling, ever. Refresh to see the real picture.",
  },
  {
    icon: "🎫",
    title: "Digital QR tickets",
    text: "Every confirmed booking issues an air-gapped digital ticket. Show the QR or PDF at the gate.",
  },
  {
    icon: "🔒",
    title: "Secure checkout",
    text: "Prices are always derived server-side and payments are HMAC-verified. No surprises at the counter.",
  },
  {
    icon: "↩️",
    title: "Fair cancellation",
    text: "Need to change plans? Cancel online and track your refund from request to settlement.",
  },
];

const PERKS = [
  { icon: "🚌", title: "AC / Non-AC & sleeper", text: "Choose your ride from verified operators." },
  { icon: "🪑", title: "Pick your exact seat", text: "VIP, ordinary — and wheelchair accessible rows." },
  { icon: "⏱️", title: "Minute-level timing", text: "Exact departure & arrival, real durations." },
];

const STEPS = [
  { n: "01", t: "Search & compare", d: "Pick cities and date. Compare price, bus type and departure window in real time." },
  { n: "02", t: "Choose your exact seat", d: "See the live seat map with VIP and accessible rows marked clearly. Everything in MMK." },
  { n: "03", t: "Pay & get your ticket", d: "Secure payment confirms instantly. Your QR ticket appears in My bookings." },
];

export function LandingPage() {
  const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: catalogApi.cities });
  const popular = cities.filter((c) => c.is_popular).slice(0, 6);

  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />
      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden bg-navy-950 pb-24 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(36,69,224,0.45),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(229,143,16,0.18),transparent_50%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="container-app relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="badge border border-white/15 bg-white/10 text-accent-300">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent-400" /> Across Myanmar 🇲🇲
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Book your seat,
              <br />
              <span className="text-gradient">keep your plans.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-navy-200">
              TikeSho connects you to verified car & bus operators with real-time seat maps, honest
              prices, and tickets you can trust.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {PERKS.map((p) => (
                <div key={p.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <span className="text-xl">{p.icon}</span>
                  <p className="mt-2 text-sm font-semibold text-white">{p.title}</p>
                  <p className="mt-1 hidden text-xs leading-relaxed text-navy-300 sm:block">{p.text}</p>
                </div>
              ))}
            </div>
            <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[
                { k: "60+", v: "Verified operators" },
                { k: "120+", v: "Cities covered" },
                { k: "4.9★", v: "Traveler rating" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-xl font-extrabold text-white">{s.k}</dt>
                  <dd className="text-navy-300">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:justify-self-end lg:w-full">
            <div className="card animate-fade-up p-6 text-navy-900 shadow-pop">
              <h2 className="font-display text-xl font-extrabold text-navy-900">Where are you headed?</h2>
              <p className="mb-5 mt-1 text-sm text-navy-500">Search live trips in under a minute.</p>
              <SearchForm initial={{ passengers: 1 }} />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-navy-100 bg-navy-50/60">
        <div className="container-app grid grid-cols-2 gap-6 py-8 text-center sm:grid-cols-4">
          {[
            ["🛡️", "HMAC-verified payments"],
            ["🧾", "Server-side pricing"],
            ["♻️", "Instant seat release"],
            ["📱", "Mobile-first by design"],
          ].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <span className="text-xl">{icon}</span>
              <span className="text-xs font-semibold text-navy-600">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular cities */}
      <section className="container-app py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-navy-900">Popular routes</h2>
            <p className="mt-1 text-navy-500">Jump straight into a trip people actually take.</p>
          </div>
          <Link to="/search" className="text-sm font-semibold text-brand-700 hover:underline">
            Browse all trips →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {popular.map((c) => (
            <Link
              key={c.id}
              to={`/search?destination_city_id=${c.id}`}
              className="card group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-700">
                {initials(c.name)}
              </span>
              <span>
                <span className="block text-sm font-bold text-navy-900">{c.name}</span>
                <span className="text-xs text-navy-400">{c.region ?? "Popular"}</span>
              </span>
              <span className="ml-auto text-brand-500 transition group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-navy-50/60 py-16">
        <div className="container-app">
          <h2 className="text-center font-display text-3xl font-extrabold text-navy-900">
            From search to seat in 3 steps
          </h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card relative p-6">
                <span className="font-display text-3xl font-extrabold text-brand-200">{s.n}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-navy-900">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-app py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-display text-base font-bold text-navy-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-app pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-navy-fade px-8 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(229,143,16,0.25),transparent_45%)]" />
          <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">
            Your next journey starts here.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-navy-200">
            Reserve your exact seat in minutes with honest, server-verified pricing.
          </p>
          <Link
            to="/search"
            className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-500"
          >
            Find a trip →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
