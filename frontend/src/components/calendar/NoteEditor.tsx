import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { CalendarModal } from "@/components/calendar/Modal";
import { dangerBtnClass, fieldClass, labelClass, secondaryBtnClass } from "@/components/calendar/ui";
import type { CalendarNote } from "@/components/calendar/types";
import { fromISODate } from "@/utils/calendarUtils";

/** Add / edit the note attached to a specific day. Mounted only while open. */
export function NoteEditor({
  onClose,
  dark,
  date,
  note,
  onSave,
  onDelete,
}: {
  onClose: () => void;
  dark: boolean;
  date: string;
  note: CalendarNote | null;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const uid = useId();
  const [text, setText] = useState(() => note?.text ?? "");
  const d = fromISODate(date);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSave(text);
    onClose();
  }

  return (
    <CalendarModal
      open
      onClose={onClose}
      dark={dark}
      title={note ? t("calendar.note.editTitle") : t("calendar.note.addTitle")}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          {note ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className={dangerBtnClass()}
            >
              <Trash2 className="h-4 w-4" />
              {t("calendar.delete")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={secondaryBtnClass(dark)}>
              {t("calendar.cancel")}
            </button>
            <button type="submit" form={`${uid}-note`} className="btn-primary min-h-11">
              {t("calendar.note.save")}
            </button>
          </div>
        </div>
      }
    >
      <form id={`${uid}-note`} onSubmit={submit} className="space-y-3">
        <p className={`text-sm ${dark ? "text-[#a8b9da]" : "text-navy-500"}`}>
          {t("calendar.note.longDate", {
            weekday: t(`calendar.weekdays.long.${d.getDay()}`),
            month: t(`calendar.months.${d.getMonth()}`),
            day: d.getDate(),
            year: d.getFullYear(),
          })}
        </p>
        <div>
          <label htmlFor={`${uid}-text`} className={labelClass(dark)}>
            {t("calendar.note.label")}
          </label>
          <textarea
            id={`${uid}-text`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={t("calendar.note.placeholder")}
            className={`${fieldClass(dark)} resize-none`}
            autoFocus
          />
        </div>
      </form>
    </CalendarModal>
  );
}
