import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { LanguageSelect } from "../components/ui/LanguageSelect";
import { BRAND_COLORS, BrandMark, BrandStripe } from "../components/ui/BrandMark";
import { LabLogo, usePublicLabIdentity } from "../components/ui/LabLogo";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useT } from "../i18n";
import { useAuth } from "../lib/auth";
import { getSafeInternalRedirect } from "../lib/navigation";
import { supabaseConfigurationError } from "../lib/supabaseClient";

export function Login() {
  const { authConfigured, loading, session, signIn } = useAuth();
  const t = useT();
  const identity = usePublicLabIdentity();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const redirectTo = getSafeInternalRedirect(
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/",
  );

  if (!loading && session) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch {
      setErrorMessage(t("login.invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-text lg:grid lg:grid-cols-[1fr_minmax(28rem,34rem)]">
      <aside className="relative hidden flex-col justify-center overflow-hidden border-r border-border bg-surface px-16 lg:flex">
        <BrandStripe className="absolute inset-x-0 top-0 h-2" />
        <LabLogo alt={identity?.name ?? t("logo.alt")} className="h-28 max-w-sm self-start" favicon fallback={<BrandMark className="text-7xl" />} logos={identity} />
        <p className="font-display mt-3 text-3xl font-semibold text-muted">Lab Manager</p>
        <p className="mt-6 max-w-sm text-lg leading-7 text-muted">{t("brand.tagline2")}</p>
        <div aria-hidden="true" className="mt-12 grid max-w-xs grid-cols-4 gap-3">
          {BRAND_COLORS.map((color) => (
            <span key={color} className="h-16 rounded-lg" style={{ backgroundColor: color }} />
          ))}
        </div>
      </aside>
      <div>
        <BrandStripe className="mb-6 h-1.5 lg:hidden" />
      <div className="px-5 pb-8">
        <div className="mx-auto flex w-full max-w-md flex-wrap justify-end gap-2 lg:pt-8">
          <LanguageSelect />
          <ThemeToggle />
        </div>
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6 lg:hidden">
          <LabLogo alt={identity?.name ?? t("logo.alt")} className="h-14 max-w-[14rem]" fallback={<BrandMark className="text-3xl" />} logos={identity} />
          <h1 className="mt-1 text-[28px] font-bold leading-tight">
            Lab Manager
          </h1>
        </div>

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t("login.title")}</h2>
              <p className="mt-1 text-base text-muted">
                {t("login.subtitle")}
              </p>
            </div>
          </div>

          {!authConfigured ? (
            <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
              {supabaseConfigurationError ??
                t("login.notConfigured")}
            </p>
          ) : null}

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-base font-semibold">
              {t("login.email")}
              <input
                autoComplete="email"
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                disabled={!authConfigured || submitting}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="grid gap-2 text-base font-semibold">
              {t("login.password")}
              <input
                autoComplete="current-password"
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                disabled={!authConfigured || submitting}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {errorMessage ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                {errorMessage}
              </p>
            ) : null}

            <Button
              disabled={!authConfigured || submitting}
              fullWidth
              type="submit"
            >
              <LogIn className="mr-2 h-5 w-5" aria-hidden="true" />
              {submitting ? t("login.submitting") : t("login.submit")}
            </Button>
          </form>
        </Card>
      </section>
      </div>
      </div>
    </main>
  );
}
