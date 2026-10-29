/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary action / brand — royal blue
        brand: {
          50: "#eef3ff",
          100: "#dce6fe",
          200: "#c0d1fe",
          300: "#94b0fb",
          400: "#6086f7",
          500: "#3b62ef",
          600: "#2445e0",
          700: "#1d36c4",
          800: "#1d2f9e",
          900: "#1c2c7d",
          950: "#131c4d",
        },
        // Deep navy — dark surfaces, headers, footers, headings
        navy: {
          50: "#f2f5fa",
          100: "#e4e9f2",
          200: "#c5cfe3",
          300: "#9aaacb",
          400: "#6779a5",
          500: "#47588a",
          600: "#34446f",
          700: "#29365a",
          800: "#1b2748",
          900: "#0f1b38",
          950: "#080f24",
        },
        // Vibrant orange — primary call-to-action buttons
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        // Premium gold — reserved for "pending" / status accents
        accent: {
          50: "#fff8e8",
          100: "#feeec7",
          200: "#fddb8e",
          300: "#fbc34f",
          400: "#f7a81f",
          500: "#e58f10",
          600: "#c76f0a",
          700: "#9f510c",
          800: "#813f10",
          900: "#6b3411",
        },
        cream: "#f6f8fc",
        ink: "#0b1220",
      },
      fontFamily: {
        /* Global font: Noto Sans Myanmar (Unicode) — configured for the
           default `sans` stack too, so preflight html and any unstyled
           text inherit it. CSS vars let FontToggle swap Latin-first. */
        sans: ["var(--font-body, \"Noto Sans Myanmar\")", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display, \"Noto Sans Myanmar\")", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body, \"Noto Sans Myanmar\")", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,56,0.05), 0 8px 24px rgba(15,27,56,0.07)",
        pop: "0 2px 8px rgba(15,27,56,0.10), 0 20px 48px rgba(15,27,56,0.14)",
        glow: "0 0 0 1px rgba(36,69,224,0.12), 0 12px 32px rgba(36,69,224,0.22)",
        cta: "0 8px 20px -6px rgba(249,115,22,0.55)",
        "cta-lg": "0 14px 34px -10px rgba(249,115,22,0.65)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "navy-fade": "linear-gradient(135deg, #0f1b38 0%, #1b2748 50%, #1d2f9e 100%)",
        "royal-fade": "linear-gradient(135deg, #2445e0 0%, #3b62ef 100%)",
        "hero-fade": "linear-gradient(160deg, #0B132B 0%, #0F172A 55%, #16223D 100%)",
        "orange-fade": "linear-gradient(135deg, #fb923c 0%, #f97316 55%, #ea580c 100%)",
        "grid-fade": "radial-gradient(ellipse at top right, rgba(249,115,22,0.18), transparent 55%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(36,69,224,0.45)" },
          "100%": { boxShadow: "0 0 0 12px rgba(36,69,224,0)" },
        },
        "cal-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "cal-pop": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "cal-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        /* Hero scene — bus drives fully across the frame (off-screen both ends,
           so the loop seam is invisible) */
        "bus-drive": {
          "0%": { transform: "translateX(-420px)" },
          "100%": { transform: "translateX(660px)" },
        },
        "wheel-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        /* One dash period = 64 user units, so the road loops seamlessly */
        "road-scroll": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "64" },
        },
        "moon-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        twinkle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
        "cloud-drift": {
          "0%, 100%": { transform: "translateX(0px)" },
          "50%": { transform: "translateX(16px)" },
        },
        beam: {
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.24" },
        },
        /* Speed streaks fade in/out so the reset is hidden */
        streak: {
          "0%": { transform: "translateX(40px)", opacity: "0" },
          "15%": { opacity: "0.45" },
          "85%": { opacity: "0.45" },
          "100%": { transform: "translateX(-160px)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        shimmer: "shimmer 1.4s infinite",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        "cal-in": "cal-in 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "cal-pop": "cal-pop 0.2s ease-out both",
        "cal-fade": "cal-fade 0.2s ease-out both",
        "bus-drive": "bus-drive 12s linear infinite",
        "wheel-spin": "wheel-spin 1.7s linear infinite",
        "road-scroll": "road-scroll 0.7s linear infinite",
        "moon-glow": "moon-glow 6s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        "cloud-drift": "cloud-drift 18s ease-in-out infinite",
        beam: "beam 3.5s ease-in-out infinite",
        streak: "streak 1.4s linear infinite",
      },
    },
  },
  plugins: [],
};
