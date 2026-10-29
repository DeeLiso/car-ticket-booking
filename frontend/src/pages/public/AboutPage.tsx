import { Link } from "react-router-dom";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { DestinationScene } from "@/components/graphics/DestinationScene";
import { APP_NAME, SUPPORT_PHONE } from "@/config";

const STATS = [
  { value: "1775+", label: "Trips published" },
  { value: "14", label: "Cities covered" },
  { value: "8", label: "Verified operators" },
  { value: "24/7", label: "Support line" },
];

const SERVICES = [
  {
    icon: "🎟️",
    title: "Seat-level booking",
    text: "Pick your exact seat from a live map with VIP and accessible rows clearly marked — no guessing.",
  },
  {
    icon: "🗺️",
    title: "Route discovery",
    text: "Compare departure windows, durations and prices across every operator on your corridor.",
  },
  {
    icon: "✅",
    title: "Verified operators",
    text: "We onboard licensed, background-checked transport partners and keep their fleets auditable.",
  },
  {
    icon: "💳",
    title: "Secure payments",
    text: "Server-verified pricing and HMAC-signed checkout in MMK and mobile wallets.",
  },
  {
    icon: "🎫",
    title: "Digital tickets",
    text: "Every confirmed booking issues a QR ticket you can flash at the gate or download as PDF.",
  },
  {
    icon: "↩️",
    title: "Refunds & support",
    text: "Cancel online and track your refund from request to settlement, with a real human on call.",
  },
];

const VALUES = [
  { t: "Honest pricing", d: "The price you see is the price you pay. Fares are always derived server-side — never the client." },
  { t: "No overselling", d: "Atomic seat holds mean the seat you reserve is the seat you get. Inventory stays truthful." },
  { t: "Built for Myanmar", d: "Local routes, local operators, National ID (NRC) aware, and payments your travellers already use." },
];

export function AboutPage() {
  return (
    <div id="main" tabIndex={-1} className="min-h-screen bg-white outline-none">
      <PublicHeader transparent />

      {/* Deep-blue hero with illustrations */}
      <section className="relative -mt-16 overflow-hidden bg-hero-fade pb-24 pt-32 text-white">
        <div className="pointer-events-none absolute inset-0 bg-hero-grid" />
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand-500/25 blur-[120px]" />

        <div className="container-app relative z-10 grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="badge border border-white/15 bg-white/10 text-orange-200">Our story</span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              Moving Myanmar,
              <br />
              <span className="text-gradient">one seat at a time.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-navy-200">
              {APP_NAME} is a modern car &amp; bus ticketing platform built for how people actually travel.
              We connect passengers with verified operators through live seat maps, honest prices, and
              tickets you can trust.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/search" className="btn-primary px-6 py-3 text-base shadow-cta-lg">
                Find a trip →
              </Link>
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                className="btn inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Talk to us
              </a>
            </div>
          </div>

          <div className="relative">
            <DestinationScene className="w-full drop-shadow-[0_30px_60px_rgba(3,8,24,0.55)]" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-app relative z-20 -mt-12">
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-pop lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-2 text-center">
              <p className="font-display text-2xl font-extrabold text-orange-600 sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-navy-400">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="container-app grid gap-10 py-16 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-navy-900">Why we built it</h2>
          <p className="mt-4 leading-relaxed text-navy-500">
            Booking a journey used to mean phone calls, guesswork and a paper ticket you could lose.
            We set out to make it as simple as ordering a ride — clear options, a real seat map, and a
            confirmation you can hold in your hand.
          </p>
          <p className="mt-4 leading-relaxed text-navy-500">
            Behind the scenes that means real engineering: atomic seat holds, server-verified fares,
            signed payments and an auditable trail for every operator and every ticket.
          </p>
        </div>
        <div className="space-y-4">
          {VALUES.map((v) => (
            <div key={v.t} className="card flex gap-4 p-5">
              <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-orange-500" />
              <div>
                <h3 className="font-display text-base font-bold text-navy-900">{v.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-navy-500">{v.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-gradient-to-b from-[#0f1b3d] via-[#0b1220] to-[#0b1220] py-16 text-white">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-extrabold text-white">Our services</h2>
            <p className="mt-2 text-navy-200">
              Everything you need to plan, book and travel — from first search to final refund.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_10px_40px_-20px_rgba(5,10,24,0.9)] transition hover:-translate-y-0.5 hover:border-orange-400/50 hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.35)]">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-orange-500/12 blur-[100px]" />
                <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-brand-500/14 blur-[90px]" />
                <div className="relative">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-2xl">
                    {s.icon}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-200">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-app py-16">
        <div className="relative overflow-hidden rounded-3xl bg-navy-fade px-8 py-12 text-center text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
          <h2 className="relative font-display text-3xl font-extrabold sm:text-4xl">Ready to ride with us?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-navy-200">
            Search live trips, grab your exact seat and travel with confidence.
          </p>
          <Link to="/search" className="btn-primary relative mt-7 px-6 py-3 text-base shadow-cta-lg">
            Find a trip →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
