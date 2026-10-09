/** @type {import('tailwindcss').Config} */
export default {
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
        // Premium gold accent (also used for "pending" states)
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
        display: ["Manrope", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,56,0.05), 0 8px 24px rgba(15,27,56,0.07)",
        pop: "0 2px 8px rgba(15,27,56,0.10), 0 20px 48px rgba(15,27,56,0.14)",
        glow: "0 0 0 1px rgba(36,69,224,0.12), 0 12px 32px rgba(36,69,224,0.22)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "navy-fade": "linear-gradient(135deg, #0f1b38 0%, #1b2748 50%, #1d2f9e 100%)",
        "royal-fade": "linear-gradient(135deg, #2445e0 0%, #3b62ef 100%)",
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
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out both",
        shimmer: "shimmer 1.4s infinite",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
