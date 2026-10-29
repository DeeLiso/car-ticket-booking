import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANG_STORAGE_KEY = "tmax.lang";
export type Lang = "my" | "en";
export const LANGS: readonly Lang[] = ["my", "en"] as const;

export function detectLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "my" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "my";
}

type JsonModule = { default: Record<string, unknown> };

/* Every src/i18n/locales/{my,en}/*.json is merged into one dictionary —
   feature areas can add their own file pair without touching this module. */
const myModules = import.meta.glob<JsonModule>("./locales/my/*.json", { eager: true });
const enModules = import.meta.glob<JsonModule>("./locales/en/*.json", { eager: true });

function merge(modules: Record<string, JsonModule>): Record<string, unknown> {
  return Object.assign({}, ...Object.values(modules).map((m) => m.default));
}

function applyDocument(lng: string) {
  document.documentElement.lang = lng;
  document.documentElement.classList.toggle("font-en", lng === "en");
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

i18n.use(initReactI18next).init({
  resources: {
    my: { translation: merge(myModules) },
    en: { translation: merge(enModules) },
  },
  lng: detectLang(),
  fallbackLng: "my",
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

applyDocument(i18n.language);
i18n.on("languageChanged", applyDocument);

export default i18n;
