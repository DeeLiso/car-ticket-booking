import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS, type Lang } from "@/i18n";

const LANG_META: Record<Lang, { label: string; flag: string }> = {
  my: { label: "မြန်မာ", flag: "🇲🇲" },
  en: { label: "English", flag: "🇬🇧" },
};

/**
 * Navbar language selector: မြန်မာ / English.
 * Closes on selection, outside click and Escape (focus returns to trigger).
 */
export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("right");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const current: Lang = i18n.language === "en" ? "en" : "my";
  const meta = LANG_META[current];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [],
        );
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        const next =
          e.key === "ArrowDown"
            ? items[(idx + 1 + items.length) % items.length]
            : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }
    };
    const onPointerDown = (e: Event) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = menuRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    selected?.focus();
  }, [open]);

  const select = (lng: Lang) => {
    setOpen(false);
    if (lng !== current) void i18n.changeLanguage(lng);
    triggerRef.current?.focus();
  };

  const toggle = () => {
    if (!open) {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) {
        const MENU_W = 176;
        setAlign(rect.right - MENU_W < 8 ? "left" : "right");
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id="lang-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="lang-switcher-menu"
        aria-label={`${t("common.language")}: ${meta.label}`}
        title={`${t("common.language")}: ${meta.label}`}
        data-lang-switcher-trigger
        onClick={toggle}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95 ${
          light
            ? "bg-navy-100 text-navy-700 hover:bg-navy-200"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        <Globe className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id="lang-switcher-menu"
          role="menu"
          aria-label={t("common.language")}
          className={`quick-menu-pop absolute top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-pop dark:border-white/10 dark:bg-navy-900 ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {LANGS.map((lng) => {
            const m = LANG_META[lng];
            const active = lng === current;
            return (
              <button
                key={lng}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => select(lng)}
                className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                    : "text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-white/5"
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {m.flag}
                </span>
                <span className="flex-1">{m.label}</span>
                {active && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
