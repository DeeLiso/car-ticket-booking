import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/common/Card";
import { InlineError } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Field";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Logo } from "@/components/common/Logo";
import { authApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";

const STRONG = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const next = searchParams.get("next") || "/";

  const register = useMutation({
    mutationFn: () =>
      authApi.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      }),
    onSuccess: (tokens) => {
      setSession(tokens);
      navigate(tokens.user.role === "PASSENGER" ? next : "/", { replace: true });
    },
    onError: (err) => {
      const msg = apiErrorMessage(err);
      if (msg.toLowerCase().includes("password")) setFieldError({ password: t("auth.register.errors.passwordWeak") });
      else setError(msg);
    },
  });

  function validate(): boolean {
    const fe: Record<string, string> = {};
    if (form.full_name.trim().length < 2) fe.full_name = t("auth.register.errors.fullNameRequired");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) fe.email = t("auth.register.errors.invalidEmail");
    if (form.password.length < 8 || !STRONG.test(form.password))
      fe.password = t("auth.register.errors.passwordWeak");
    if (form.password !== form.confirm) fe.confirm = t("auth.register.errors.passwordMismatch");
    if (form.phone && form.phone.replace(/\D/g, "").length < 6) fe.phone = t("auth.register.errors.phoneTooShort");
    setFieldError(fe);
    setError("");
    return Object.keys(fe).length === 0;
  }

  return (
    <div id="main" tabIndex={-1} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero-fade px-4 py-12 outline-none">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(36,69,224,0.45),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(229,143,16,0.22),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo imgClassName="h-12" variant="light" />
        </div>
        <Card className="p-7">
          <h1 className="font-display text-2xl font-extrabold text-navy-900">{t("auth.register.title")}</h1>
          <p className="mt-1 text-sm text-navy-500">{t("auth.register.subtitle")}</p>
          {error && (
            <div className="mt-4">
              <InlineError message={error} />
            </div>
          )}
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validate()) register.mutate();
            }}
          >
            <Field label={t("auth.register.fullName")} error={fieldError.full_name}>
              <Input
                value={form.full_name}
                autoComplete="name"
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder={t("auth.register.namePlaceholder")}
              />
            </Field>
            <Field label={t("auth.register.email")} error={fieldError.email}>
              <Input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </Field>
            <Field label={t("auth.register.phoneOptional")} error={fieldError.phone}>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="09 123 456 789"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("auth.register.password")} error={fieldError.password}>
                <PasswordInput
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              <Field label={t("auth.register.confirm")} error={fieldError.confirm}>
                <PasswordInput
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={register.isPending}>
              {t("auth.register.submit")}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-navy-500">
            {t("auth.register.alreadyMember")}{" "}
            <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700 hover:underline">
              {t("auth.register.signIn")}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}