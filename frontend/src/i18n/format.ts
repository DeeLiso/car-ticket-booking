import i18n from "@/i18n";

/** Locale tag for Intl APIs: my → "my-MM", en → "en-GB". */
export function currentLocale(): string {
  return i18n.language === "en" ? "en-GB" : "my-MM";
}

export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat(currentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat(currentLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale()).format(value);
}

export function formatMMK(amount: number): string {
  return `${new Intl.NumberFormat(currentLocale()).format(amount)} MMK`;
}
