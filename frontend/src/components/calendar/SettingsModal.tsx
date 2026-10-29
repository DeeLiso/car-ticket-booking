import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Trash2 } from "lucide-react";
import { CalendarModal } from "@/components/calendar/Modal";
import { dangerBtnClass, fieldClass, labelClass, secondaryBtnClass } from "@/components/calendar/ui";
import type { CalendarSettings } from "@/components/calendar/types";
import { type WeekStart } from "@/utils/calendarUtils";

function Segmented({
  dark,
  value,
  options,
  onChange,
}: {
  dark: boolean;
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="tablist"
      className={`inline-flex w-full rounded-xl border p-1 ${
        dark ? "border-[#2a3a5c] bg-white/5" : "border-navy-200 bg-navy-50"
      }`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : dark
                  ? "text-[#a8b9da] hover:text-white"
                  : "text-navy-600 hover:text-navy-900"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Calendar preferences: theme, week start, time format and data reset. Mounted only while open. */
export function SettingsModal({
  onClose,
  dark,
  settings,
  onChange,
  onClear,
}: {
  onClose: () => void;
  dark: boolean;
  settings: CalendarSettings;
  onChange: (patch: Partial<CalendarSettings>) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const uid = useId();
  const [confirming, setConfirming] = useState(false);

  return (
    <CalendarModal
      open
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
      dark={dark}
      title={t("calendar.settings")}
      footer={
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onClose();
          }}
          className={`${secondaryBtnClass(dark)} min-h-11`}
        >
          {t("calendar.settingsModal.done")}
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <span className={labelClass(dark)}>{t("calendar.settingsModal.appearance")}</span>
          <Segmented
            dark={dark}
            value={settings.theme}
            onChange={(v) => onChange({ theme: v as CalendarSettings["theme"] })}
            options={[
              { value: "light", label: t("calendar.settingsModal.light"), icon: <Sun className="h-4 w-4" /> },
              { value: "dark", label: t("calendar.settingsModal.dark"), icon: <Moon className="h-4 w-4" /> },
            ]}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-weekstart`} className={labelClass(dark)}>
            {t("calendar.settingsModal.weekStartsOn")}
          </label>
          <select
            id={`${uid}-weekstart`}
            value={settings.weekStartsOn}
            onChange={(e) => onChange({ weekStartsOn: Number(e.target.value) as WeekStart })}
            className={`${fieldClass(dark)} min-h-11 cursor-pointer`}
          >
            {Array.from({ length: 7 }, (_, index) => (
              <option key={index} value={index}>
                {t(`calendar.weekdays.long.${index}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className={labelClass(dark)}>{t("calendar.settingsModal.timeFormat")}</span>
          <Segmented
            dark={dark}
            value={settings.use24Hour ? "24" : "12"}
            onChange={(v) => onChange({ use24Hour: v === "24" })}
            options={[
              { value: "12", label: t("calendar.settingsModal.hour12") },
              { value: "24", label: t("calendar.settingsModal.hour24") },
            ]}
          />
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            dark ? "border-[#2a3a5c] bg-white/5" : "border-navy-100 bg-navy-50/60"
          }`}
        >
          <p className={`text-sm font-semibold ${dark ? "text-[#e9eefb]" : "text-navy-800"}`}>
            {t("calendar.settingsModal.dataTitle")}
          </p>
          <p className={`mt-1 text-xs ${dark ? "text-[#8fa0c4]" : "text-navy-500"}`}>
            {t("calendar.settingsModal.dataDesc")}
          </p>
          {confirming ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`text-sm ${dark ? "text-[#c6d3ec]" : "text-navy-700"}`}>
                {t("calendar.settingsModal.deleteAllConfirm")}
              </span>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirming(false);
                  onClose();
                }}
                className={`${dangerBtnClass()} min-h-11`}
              >
                {t("calendar.settingsModal.clearYes")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={`${secondaryBtnClass(dark)} min-h-11`}
              >
                {t("calendar.cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`mt-3 ${dangerBtnClass()} min-h-11`}
            >
              <Trash2 className="h-4 w-4" />
              {t("calendar.settingsModal.clearData")}
            </button>
          )}
        </div>
      </div>
    </CalendarModal>
  );
}
