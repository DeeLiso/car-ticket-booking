import type { MouseEvent } from "react";

export function BusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 6v6M16 6v6M2 12h20" />
      <path d="M18 18h2a1 1 0 0 0 1-1v-3.3a3 3 0 0 0-.4-1.5l-1.7-2.8A2 2 0 0 0 17.2 8H6.8a2 2 0 0 0-1.7.9L3.4 11.7A3 3 0 0 0 3 13.2V17a1 1 0 0 0 1 1h2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M9 18h6" />
    </svg>
  );
}

const LOGO_SRC = {
  color: "/brand/tmt-logo.png",
  light: "/brand/tmt-logo-light.png",
} as const;

interface LogoProps {
  /** Wrapper classes (spacing/layout). */
  className?: string;
  /** Height of the mark, e.g. "h-9". Width scales automatically. */
  imgClassName?: string;
  /** "color" for light backgrounds, "light" (recolored) for dark backgrounds. */
  variant?: keyof typeof LOGO_SRC;
  to?: string;
  alt?: string;
}

export function Logo({
  className = "",
  imgClassName = "h-9",
  variant = "color",
  to = "/",
  alt = "T-M-T Car Ticket Booking Logo",
}: LogoProps) {
  /** Full page reload (not client-side navigation) so the app resets and starts at the top. */
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Keep the browser's native behaviour for new tab/window, downloads and modified clicks.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    // Stop the browser restoring the previous scroll offset after the reload.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const target = new URL(to, window.location.origin);
    const isSamePage =
      target.pathname === window.location.pathname &&
      target.search === window.location.search &&
      target.hash === window.location.hash;

    if (isSamePage) {
      window.location.reload();
    } else {
      window.location.assign(target.href);
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={`inline-flex items-center ${className}`}
      aria-label={alt}
    >
      <img
        src={LOGO_SRC[variant]}
        alt={alt}
        className={`${imgClassName} w-auto select-none object-contain`}
        draggable={false}
      />
    </a>
  );
}
