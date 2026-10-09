import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/common/Card";
import { Alert, InlineError } from "@/components/common/Alert";
import { Button } from "@/components/common/Button";
import { Field, Input } from "@/components/common/Field";
import { authApi } from "@/services/endpoints";
import { apiErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";

export function LoginPage() {
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
    <div id="main" tabIndex={-1} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-950 px-4 py-12 outline-none">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(36,69,224,0.45),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(229,143,16,0.22),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-2xl font-extrabold text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal-fade text-lg font-black shadow-glow">T</span>
          TikeSho
        </Link>
        <Card className="p-7">
          <h1 className="font-display text-2xl font-extrabold text-navy-900">Welcome back</h1>
          <p className="mt-1 text-sm text-navy-500">Sign in to manage your bookings and tickets.</p>
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
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-navy-500">
            New to TikeSho?{" "}
            <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700 hover:underline">
              Create an account
            </Link>
          </p>
        </Card>
        <Alert tone="info">
          Demo — active staff logins are provisioned by administrators in the admin portal.
        </Alert>
      </div>
    </div>
  );
}