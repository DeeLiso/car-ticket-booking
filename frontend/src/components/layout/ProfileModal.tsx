import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarModal } from "@/components/calendar/Modal";
import { Field, Input } from "@/components/common/Field";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Alert } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { authApi } from "@/services/endpoints";
import { useAuthStore } from "@/store/auth";
import { initials } from "@/utils/format";

type Msg = { tone: "success" | "error"; text: string } | null;

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  const roleLabel =
    user?.role === "ADMIN" ? t("profile.admin") : user?.role === "BUS_OPERATOR" ? t("profile.operator") : t("profile.passenger");

  const saveProfile = async () => {
    setProfileMsg(null);
    if (fullName.trim().length < 2) {
      setProfileMsg({ tone: "error", text: t("profile.pleaseEnterFullName") });
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await authApi.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });
      setUser(updated);
      setProfileMsg({ tone: "success", text: t("profile.profileUpdated") });
    } catch (e) {
      setProfileMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      setPwMsg({
        tone: "error",
        text: t("profile.passwordNeedsRequirements"),
      });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ tone: "error", text: t("profile.passwordsDoNotMatch") });
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword(current, next);
      setPwMsg({ tone: "success", text: t("profile.passwordUpdated") });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setPwMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <CalendarModal open={open} onClose={onClose} title={t("profile.editProfile")}>
      <div className="space-y-5">
        {/* Gradient banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-orange-400/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-brand-300/30 blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold text-white ring-1 ring-inset ring-white/30 backdrop-blur-md">
              {initials(user?.full_name ?? "?")}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold text-white">
                {user?.full_name}
              </p>
              <p className="truncate text-sm text-white/70">{user?.email}</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-inset ring-white/25">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Profile details */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfile();
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-navy-400">Account</p>
          {profileMsg && (
            <Alert tone={profileMsg.tone} onClose={() => setProfileMsg(null)}>
              {profileMsg.text}
            </Alert>
          )}
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Email is used to sign in and cannot be changed here.">
            <Input value={user?.email ?? ""} disabled />
          </Field>
          <Field label="Phone — optional">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 09 123 456 789"
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}>
              Save changes
            </Button>
          </div>
        </form>

        <div className="border-t border-navy-100" />

        {/* Security */}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void changePassword();
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-navy-400">Security</p>
          {pwMsg && (
            <Alert tone={pwMsg.tone} onClose={() => setPwMsg(null)}>
              {pwMsg.text}
            </Alert>
          )}
          <Field label="Current password">
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password">
              <PasswordInput
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="brand" loading={savingPw}>
              Update password
            </Button>
          </div>
        </form>
      </div>
    </CalendarModal>
  );
}
