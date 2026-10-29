import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { CalendarModal } from "@/components/calendar/Modal";
import { dangerBtnClass, fieldClass, labelClass, secondaryBtnClass } from "@/components/calendar/ui";
import type { CalendarEvent } from "@/components/calendar/types";

interface EventDraft {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

const EMPTY: EventDraft = {
  title: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
};

/** Create / edit dialog for calendar events. Mounted only while open. */
export function EventModal({
  onClose,
  dark,
  defaultDate,
  event,
  onSave,
  onDelete,
}: {
  onClose: () => void;
  dark: boolean;
  defaultDate: string;
  event: CalendarEvent | null;
  onSave: (draft: EventDraft) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const uid = useId();
  const [draft, setDraft] = useState<EventDraft>(() =>
    event
      ? {
          title: event.title,
          description: event.description ?? "",
          date: event.date,
          startTime: event.startTime ?? "",
          endTime: event.endTime ?? "",
          location: event.location ?? "",
        }
      : { ...EMPTY, date: defaultDate },
  );
  const [error, setError] = useState("");

  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit(evt: React.FormEvent) {
    evt.preventDefault();
    if (!draft.title.trim()) {
      setError(t("calendar.event.errorTitle"));
      return;
    }
    if (!draft.date) {
      setError(t("calendar.event.errorDate"));
      return;
    }
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
      setError(t("calendar.event.errorTime"));
      return;
    }
    onSave({
      title: draft.title.trim(),
      description: draft.description.trim(),
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      location: draft.location.trim(),
    });
    onClose();
  }

  return (
    <CalendarModal
      open
      onClose={onClose}
      dark={dark}
      title={event ? t("calendar.event.editTitle") : t("calendar.event.newTitle")}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          {event ? (
            <button
              type="button"
              onClick={() => {
                onDelete(event.id);
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
            <button type="submit" form={`${uid}-event`} className="btn-primary min-h-11">
              {event ? t("calendar.event.saveChanges") : t("calendar.event.saveEvent")}
            </button>
          </div>
        </div>
      }
    >
      <form id={`${uid}-event`} onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500"
          >
            {error}
          </p>
        )}

        <div>
          <label htmlFor={`${uid}-title`} className={labelClass(dark)}>
            {t("calendar.event.title")}
          </label>
          <input
            id={`${uid}-title`}
            type="text"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={t("calendar.event.titlePlaceholder")}
            className={fieldClass(dark)}
            autoFocus
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-date`} className={labelClass(dark)}>
              {t("calendar.event.date")}
            </label>
            <input
              id={`${uid}-date`}
              type="date"
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
              className={fieldClass(dark)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${uid}-start`} className={labelClass(dark)}>
              {t("calendar.event.startTime")}
            </label>
            <input
              id={`${uid}-start`}
              type="time"
              value={draft.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className={fieldClass(dark)}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-end`} className={labelClass(dark)}>
              {t("calendar.event.endTime")}
            </label>
            <input
              id={`${uid}-end`}
              type="time"
              value={draft.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className={fieldClass(dark)}
            />
          </div>
        </div>

        <div>
            <label htmlFor={`${uid}-location`} className={labelClass(dark)}>
              {t("calendar.event.location")}{" "}
              <span className="font-normal opacity-60">{t("calendar.event.optional")}</span>
            </label>
            <input
              id={`${uid}-location`}
              type="text"
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder={t("calendar.event.locationPlaceholder")}
            className={fieldClass(dark)}
          />
        </div>

        <div>
          <label htmlFor={`${uid}-desc`} className={labelClass(dark)}>
            {t("calendar.event.description")}
          </label>
          <textarea
            id={`${uid}-desc`}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder={t("calendar.event.descPlaceholder")}
            className={`${fieldClass(dark)} resize-none`}
          />
        </div>
      </form>
    </CalendarModal>
  );
}
