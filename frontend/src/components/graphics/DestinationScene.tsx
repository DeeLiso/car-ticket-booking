export function DestinationScene({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 960 420"
      role="img"
      aria-label="Illustration of a bus route connecting destinations across a landscape"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ds-orange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff8438" />
          <stop offset="100%" stopColor="#ff6a12" />
        </linearGradient>
        <linearGradient id="ds-bus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b7cf7" />
          <stop offset="100%" stopColor="#2445e0" />
        </linearGradient>
        <radialGradient id="ds-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ff8438" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ff8438" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sun glow */}
      <circle cx="806" cy="110" r="150" fill="url(#ds-sun)" />
      <circle cx="806" cy="110" r="52" fill="url(#ds-orange)" opacity="0.9" />

      {/* clouds */}
      <g fill="#ffffff" opacity="0.14">
        <rect x="120" y="78" width="120" height="26" rx="13" />
        <rect x="170" y="58" width="90" height="24" rx="12" />
        <rect x="620" y="66" width="150" height="26" rx="13" />
        <rect x="690" y="46" width="80" height="24" rx="12" />
      </g>

      {/* route dotted path */}
      <path
        d="M150 214 C 330 60, 640 60, 812 214"
        fill="none"
        stroke="#ff8438"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="2 14"
        opacity="0.9"
      />

      {/* destination pins */}
      <g>
        <path d="M150 186 c-13 0 -24 11 -24 24 c0 17 24 40 24 40 s24 -23 24 -40 c0 -13 -11 -24 -24 -24 z" fill="url(#ds-orange)" />
        <circle cx="150" cy="210" r="8" fill="#fff" />
      </g>
      <g>
        <path d="M812 186 c-13 0 -24 11 -24 24 c0 17 24 40 24 40 s24 -23 24 -40 c0 -13 -11 -24 -24 -24 z" fill="url(#ds-orange)" />
        <circle cx="812" cy="210" r="8" fill="#fff" />
      </g>
      <g>
        <path d="M481 74 c-11 0 -20 9 -20 20 c0 14 20 33 20 33 s20 -19 20 -33 c0 -11 -9 -20 -20 -20 z" fill="#6d8dff" />
        <circle cx="481" cy="94" r="6.5" fill="#fff" />
      </g>

      {/* distant mountains */}
      <path d="M0 330 L140 214 L260 300 L360 236 L470 330 Z" fill="#22305a" opacity="0.75" />
      <path d="M520 330 L640 226 L760 300 L860 246 L960 330 Z" fill="#22305a" opacity="0.75" />

      {/* pagoda silhouette */}
      <g fill="#2b3a66">
        <rect x="452" y="300" width="56" height="12" rx="2" />
        <path d="M460 300 h40 l-6 -16 h-28 z" />
        <path d="M464 284 h32 c0 -20 -8 -30 -16 -40 c-8 10 -16 20 -16 40 z" />
        <polygon points="480,212 473,250 487,250" />
        <rect x="477" y="200" width="6" height="16" rx="3" />
        <circle cx="480" cy="196" r="5" />
      </g>

      {/* ground */}
      <rect x="0" y="330" width="960" height="90" fill="#0d1730" />
      <rect x="0" y="330" width="960" height="3" fill="#2b3a66" opacity="0.7" />
      <line x1="40" y1="386" x2="920" y2="386" stroke="#ffb26b" strokeWidth="6" strokeLinecap="round" strokeDasharray="40 34" opacity="0.7" />

      {/* bus */}
      <g transform="translate(330 258)">
        <rect x="0" y="0" width="300" height="86" rx="18" fill="url(#ds-bus)" />
        <rect x="14" y="6" width="270" height="7" rx="3.5" fill="#8fa8ff" opacity="0.5" />
        <rect x="14" y="16" width="262" height="36" rx="9" fill="#0d1633" />
        <g fill="#dbe7ff">
          <rect x="22" y="22" width="42" height="24" rx="5" />
          <rect x="70" y="22" width="42" height="24" rx="5" />
          <rect x="118" y="22" width="42" height="24" rx="5" />
          <rect x="166" y="22" width="42" height="24" rx="5" />
          <rect x="214" y="22" width="54" height="24" rx="5" />
        </g>
        <rect x="0" y="60" width="300" height="11" fill="url(#ds-orange)" />
        <rect x="286" y="52" width="12" height="14" rx="5" fill="#ffd9a8" />
        <circle cx="66" cy="86" r="22" fill="#0a1128" />
        <circle cx="66" cy="86" r="9" fill="#31406e" />
        <circle cx="240" cy="86" r="22" fill="#0a1128" />
        <circle cx="240" cy="86" r="9" fill="#31406e" />
      </g>
    </svg>
  );
}
