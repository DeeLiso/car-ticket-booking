import type { CSSProperties } from "react";

const WHEEL_STYLE: CSSProperties = {
  transformBox: "fill-box",
  transformOrigin: "center",
};

type Star = { cx: number; cy: number; r: number; delay: number; dim?: boolean };

const STARS: Star[] = [
  { cx: 62, cy: 54, r: 2.3, delay: 0 },
  { cx: 132, cy: 118, r: 1.7, delay: 0.8, dim: true },
  { cx: 214, cy: 60, r: 2, delay: 1.6 },
  { cx: 300, cy: 106, r: 1.6, delay: 0.4, dim: true },
  { cx: 96, cy: 178, r: 1.6, delay: 2.1, dim: true },
  { cx: 262, cy: 172, r: 1.8, delay: 1.2, dim: true },
  { cx: 372, cy: 64, r: 1.6, delay: 2.6 },
  { cx: 430, cy: 148, r: 1.9, delay: 1.9 },
  { cx: 588, cy: 62, r: 2.1, delay: 1.4 },
  { cx: 552, cy: 196, r: 1.6, delay: 0.6, dim: true },
];

export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Animated night scene of a coach bus travelling along a road toward a city skyline, passing a golden pagoda beneath the moon."
      className={`relative aspect-[16/10] overflow-hidden rounded-[28px] border border-white/10 bg-[#070e22] shadow-[0_30px_70px_-24px_rgba(3,8,24,0.85)] ${className}`}
    >
      <svg
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hi-sky" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor="#050b1c" />
            <stop offset="58%" stopColor="#0d1734" />
            <stop offset="100%" stopColor="#17245a" />
          </linearGradient>
          <radialGradient id="hi-moon" cx="0.42" cy="0.38" r="0.62">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="62%" stopColor="#e6ecff" />
            <stop offset="100%" stopColor="#bccbef" />
          </radialGradient>
          <radialGradient id="hi-moonGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#eaf0ff" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#cdd9ff" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#cdd9ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hi-pagodaGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffd39a" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#ffd39a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hi-hillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b2a56" />
            <stop offset="100%" stopColor="#131f45" />
          </linearGradient>
          <linearGradient id="hi-hillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#101a3a" />
            <stop offset="100%" stopColor="#0a1330" />
          </linearGradient>
          <linearGradient id="hi-bus" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7cf7" />
            <stop offset="55%" stopColor="#2f52ea" />
            <stop offset="100%" stopColor="#1d34b6" />
          </linearGradient>
          <linearGradient id="hi-busWin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbe7ff" />
            <stop offset="100%" stopColor="#9fb8f2" />
          </linearGradient>
          <linearGradient id="hi-orange" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff8438" />
            <stop offset="100%" stopColor="#ff6a12" />
          </linearGradient>
          <linearGradient id="hi-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111c3d" />
            <stop offset="100%" stopColor="#070d20" />
          </linearGradient>
          <pattern id="hi-win" width="18" height="20" patternUnits="userSpaceOnUse">
            <rect x="5" y="6" width="7" height="8" rx="1.5" fill="#93b0f5" opacity="0.85" />
          </pattern>
        </defs>

        {/* sky */}
        <rect x="0" y="0" width="640" height="400" fill="url(#hi-sky)" />

        {/* stars */}
        <g fill="#dbe7ff">
          {STARS.map((s) => (
            <circle
              key={`${s.cx}-${s.cy}`}
              cx={s.cx}
              cy={s.cy}
              r={s.r}
              opacity={s.dim ? 0.7 : 0.95}
              className="motion-safe:animate-twinkle"
              style={{ animationDelay: `${s.delay}s` }}
            />
          ))}
        </g>

        {/* moon */}
        <circle className="motion-safe:animate-moon-glow" cx="498" cy="104" r="120" fill="url(#hi-moonGlow)" />
        <circle cx="498" cy="104" r="44" fill="url(#hi-moon)" />
        <circle cx="483" cy="94" r="7" fill="#c4d0ee" opacity="0.5" />
        <circle cx="510" cy="118" r="5" fill="#c4d0ee" opacity="0.45" />
        <circle cx="501" cy="86" r="3.4" fill="#c4d0ee" opacity="0.4" />

        {/* drifting clouds */}
        <g className="motion-safe:animate-cloud-drift" fill="#ffffff" opacity="0.07">
          <rect x="70" y="96" width="150" height="16" rx="8" />
          <rect x="110" y="128" width="96" height="12" rx="6" />
          <rect x="420" y="196" width="128" height="14" rx="7" />
        </g>

        {/* distant hills */}
        <path
          d="M0 322 C 90 262, 176 300, 250 316 C 316 330, 372 300, 440 312 C 516 326, 580 300, 640 316 L640 400 L0 400 Z"
          fill="url(#hi-hillBack)"
        />
        <path
          d="M0 344 C 120 318, 210 344, 320 340 C 430 336, 520 350, 640 336 L640 400 L0 400 Z"
          fill="url(#hi-hillFront)"
        />

        {/* pagoda (myanmar landmark) */}
        <ellipse cx="300" cy="318" rx="96" ry="58" fill="url(#hi-pagodaGlow)" />
        <g fill="#f2b06a">
          <rect x="268" y="322" width="64" height="10" rx="2" />
          <path d="M276 322 h48 l-7 -15 h-34 z" />
          <path d="M281 307 h38 c0 -22 -9 -33 -19 -44 c-10 11 -19 22 -19 44 z" />
          <polygon points="300,222 291,266 309,266" />
          <rect x="297" y="206" width="6" height="18" rx="3" />
          <circle cx="300" cy="201" r="5" />
        </g>

        {/* city skyline — the destination */}
        <g>
          <rect x="372" y="246" width="46" height="94" rx="4" fill="#1b2748" />
          <rect x="375" y="252" width="40" height="84" rx="3" fill="url(#hi-win)" opacity="0.5" />
          <rect x="424" y="212" width="40" height="128" rx="4" fill="#22305a" />
          <rect x="427" y="218" width="34" height="118" rx="3" fill="url(#hi-win)" opacity="0.45" />
          <rect x="470" y="262" width="54" height="78" rx="4" fill="#1b2748" />
          <rect x="473" y="268" width="48" height="68" rx="3" fill="url(#hi-win)" opacity="0.5" />
          <rect x="530" y="230" width="34" height="110" rx="4" fill="#22305a" />
          <rect x="533" y="236" width="28" height="100" rx="3" fill="url(#hi-win)" opacity="0.4" />
          <rect x="588" y="270" width="40" height="70" rx="4" fill="#1b2748" />
          <rect x="591" y="276" width="34" height="62" rx="3" fill="url(#hi-win)" opacity="0.5" />
        </g>

        {/* road */}
        <rect x="0" y="330" width="640" height="70" fill="url(#hi-road)" />
        <rect x="0" y="330" width="640" height="3" fill="#2b3a66" opacity="0.7" />
        <line
          x1="20"
          y1="372"
          x2="620"
          y2="372"
          stroke="#ffb26b"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="34 30"
          opacity="0.85"
          className="motion-safe:animate-road-scroll"
        />

        {/* speed streaks */}
        <g stroke="#9fb8f2" strokeWidth="3" strokeLinecap="round">
          <line x1="120" y1="300" x2="90" y2="300" opacity="0.35" className="motion-safe:animate-streak" />
          <line x1="150" y1="330" x2="118" y2="330" opacity="0.35" className="motion-safe:animate-streak" style={{ animationDelay: "0.5s" }} />
          <line x1="132" y1="360" x2="96" y2="360" opacity="0.35" className="motion-safe:animate-streak" style={{ animationDelay: "0.9s" }} />
        </g>

        {/* bus */}
        <g transform="translate(0,266)">
          <g className="motion-safe:animate-bus-drive">
            {/* ground shadow */}
            <ellipse cx="150" cy="116" rx="158" ry="14" fill="#04091c" opacity="0.4" />
            {/* headlight beam */}
            <path
              d="M300 60 L432 30 L432 96 Z"
              fill="#ffe6bd"
              opacity="0.2"
              className="motion-safe:animate-beam"
            />
            {/* body */}
            <rect x="0" y="0" width="300" height="92" rx="20" fill="url(#hi-bus)" />
            {/* roof highlight */}
            <rect x="16" y="6" width="268" height="8" rx="4" fill="#8fa8ff" opacity="0.55" />
            {/* window band */}
            <rect x="16" y="16" width="262" height="38" rx="10" fill="#0d1633" />
            <g fill="url(#hi-busWin)">
              <rect x="24" y="22" width="42" height="26" rx="5" />
              <rect x="72" y="22" width="42" height="26" rx="5" />
              <rect x="120" y="22" width="42" height="26" rx="5" />
              <rect x="168" y="22" width="42" height="26" rx="5" />
              <rect x="216" y="22" width="54" height="26" rx="5" />
            </g>
            {/* orange stripe */}
            <rect x="0" y="66" width="300" height="12" fill="url(#hi-orange)" />
            <rect x="0" y="78" width="300" height="14" fill="#1d2f9e" opacity="0.35" />
            {/* headlight */}
            <rect x="288" y="58" width="12" height="16" rx="5" fill="#ffe6bd" />
            {/* door */}
            <rect x="252" y="22" width="26" height="54" rx="6" fill="#16224a" opacity="0.6" />
            <line x1="265" y1="22" x2="265" y2="76" stroke="#5b7cf7" strokeWidth="2" opacity="0.6" />
            {/* side mirror */}
            <rect x="288" y="14" width="10" height="18" rx="3" fill="#1d34b6" />
            {/* wheels */}
            <g className="motion-safe:animate-wheel-spin" style={WHEEL_STYLE}>
              <circle cx="68" cy="94" r="24" fill="#0a1128" />
              <circle cx="68" cy="94" r="11" fill="#31406e" />
              <circle cx="68" cy="94" r="4" fill="#8fa8ff" />
              <line x1="68" y1="78" x2="68" y2="110" stroke="#8fa8ff" strokeWidth="3" opacity="0.5" />
            </g>
            <g className="motion-safe:animate-wheel-spin" style={WHEEL_STYLE}>
              <circle cx="240" cy="94" r="24" fill="#0a1128" />
              <circle cx="240" cy="94" r="11" fill="#31406e" />
              <circle cx="240" cy="94" r="4" fill="#8fa8ff" />
              <line x1="240" y1="78" x2="240" y2="110" stroke="#8fa8ff" strokeWidth="3" opacity="0.5" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
