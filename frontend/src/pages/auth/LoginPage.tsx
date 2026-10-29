import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/common/Card";
import { Alert, InlineError } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Field";
import { PasswordInput } from "@/components/common/PasswordInput";
import { Logo } from "@/components/common/Logo";
import { authApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const next = searchParams.get("next") || "/";

  const login = useMutation({
    mutationFn: () => authApi.login(form.email, form.password),
    onSuccess: (tokens) => {
      setSession(tokens);
      const dest = tokens.user.role === "ADMIN" ? "/admin" : tokens.user.role === "BUS_OPERATOR" ? "/operator" : next;
      navigate(dest, { replace: true });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <div id="main" tabIndex={-1} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-hero-fade px-4 py-12 outline-none">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-hero-grid" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(36,69,224,0.45),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(229,143,16,0.22),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo imgClassName="h-12" variant="light" />
        </div>
        <Card className="p-7">
          <h1 className="font-display text-2xl font-extrabold text-navy-900">{t("auth.login.title")}</h1>
          <p className="mt-1 text-sm text-navy-500">{t("auth.login.subtitle")}</p>
          {error && (
            <div className="mt-4">
              <InlineError message={error} />
            </div>
          )}
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              login.mutate();
            }}
          >
            <Field label={t("auth.login.email")}>
              <Input
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label={t("auth.login.password")}>
              <PasswordInput
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
              {t("auth.login.submit")}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-navy-500">
            {t("auth.login.newToTmt")}{" "}
            <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700 hover:underline">
              {t("auth.login.createAccount")}
            </Link>
          </p>
        </Card>
        <Alert tone="info">
          {t("auth.login.demoNotice")}
        </Alert>
      </div>
    </div>
  );
}