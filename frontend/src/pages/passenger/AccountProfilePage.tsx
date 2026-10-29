import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Card, PageHeader } from "@/components/common/Card";
import { Field, Input } from "@/components/common/Field";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Alert, InlineError } from "@/components/common/Alert";
import { DetailSkeleton } from "@/components/common/Skeleton";
import { Button } from "@/components/common/Button";
import { authApi, meApi, type ProfileUpdateInput } from "@/services/endpoints";
import { useAuthStore } from "@/store/auth";
import type { PassengerProfileOut } from "@/types";
import { initials, fmtDateTime } from "@/utils/format";

type Msg = { tone: "success" | "error"; text: string } | null;

export function AccountProfilePage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["me", "profile"], queryFn: () => meApi.profile() });

  if (q.isLoading) return <DetailSkeleton label={t("account.loadingProfile")} />;
  if (q.error)
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10">
        <InlineError message={(q.error as Error).message} onRetry={() => q.refetch()} />
      </div>
    );

  return <ProfileView profile={q.data!} />;
}

function ProfileView({ profile }: { profile: PassengerProfileOut }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const roleLabel =
    profile.role === "ADMIN" ? t("account.role.admin") : profile.role === "BUS_OPERATOR" ? t("account.role.operator") : t("account.role.passenger");

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-glow">
                {initials(profile.full_name)}
              </span>
              <p className="mt-4 font-display text-lg font-bold text-navy-900">{profile.full_name}</p>
              <p className="text-sm text-navy-500">{profile.email}</p>
              <span className="mt-3 rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                {roleLabel}
              </span>
            </div>
            {user?.created_at && (
              <p className="mt-5 border-t border-navy-100 pt-4 text-center text-xs text-navy-400">
                {t("profile.memberSince", { when: fmtDateTime(user.created_at) })}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <ProfileForm profile={profile} />
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="font-display text-base font-bold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function ProfileForm({ profile }: { profile: PassengerProfileOut }) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [idNumber, setIdNumber] = useState(profile.id_number ?? "");
  const [address, setAddress] = useState(profile.address ?? "");
  const [emergency, setEmergency] = useState(profile.emergency_contact ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const save = async () => {
    setMsg(null);
    if (fullName.trim().length < 2) {
      setMsg({ tone: "error", text: t("profile.personal.nameRequired") });
      return;
    }
    const payload: ProfileUpdateInput = {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      id_number: idNumber.trim() || null,
      address: address.trim() || null,
      emergency_contact: emergency.trim() || null,
    };
    setSaving(true);
    try {
      const updated = await meApi.updateProfile(payload);
      const fresh = await authApi.me();
      setUser(fresh);
      qc.setQueryData(["me", "profile"], updated);
      setMsg({ tone: "success", text: t("profile.personal.saved") });
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title={t("profile.personal.title")} subtitle={t("profile.personal.subtitle")}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {msg && (
          <Alert tone={msg.tone} onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.personal.fullName")}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label={t("profile.personal.phone")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("profile.personal.phonePlaceholder")} />
          </Field>
        </div>
        <Field label={t("profile.personal.email")} hint={t("profile.personal.emailHint")}>
          <Input value={profile.email} disabled />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.personal.idNumber")}>
            <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder={t("profile.personal.idPlaceholder")} />
          </Field>
          <Field label={t("profile.personal.emergency")}>
            <Input value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder={t("profile.personal.emergencyPlaceholder")} />
          </Field>
        </div>
        <Field label={t("profile.personal.address")}>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("profile.personal.addressPlaceholder")} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            {t("profile.personal.save")}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function PasswordForm() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const submit = async () => {
    setMsg(null);
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      setMsg({ tone: "error", text: t("profile.security.weak") });
      return;
    }
    if (next !== confirm) {
      setMsg({ tone: "error", text: t("profile.security.mismatch") });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      setMsg({ tone: "success", text: t("profile.security.saved") });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title={t("profile.security.title")} subtitle={t("profile.security.subtitle")}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {msg && (
          <Alert tone={msg.tone} onClose={() => setMsg(null)}>
            {msg.text}
          </Alert>
        )}
        <Field label={t("profile.security.current")}>
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.security.new")}>
            <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label={t("profile.security.confirm")}>
            <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="brand" loading={saving}>
            {t("profile.security.submit")}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
