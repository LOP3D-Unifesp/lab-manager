import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../lib/auth";
import { getSafeInternalRedirect } from "../lib/navigation";
import { supabaseConfigurationError } from "../lib/supabaseClient";

export function Login() {
  const { authConfigured, loading, session, signIn } = useAuth();
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
      setErrorMessage("Email ou senha invalidos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6">
          <p className="text-lg font-semibold text-primary">LO&P3D</p>
          <h1 className="mt-1 text-[34px] font-bold leading-tight">
            Lab Manager
          </h1>
        </div>

        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Entrar</h2>
              <p className="mt-1 text-base text-muted">
                Use seu email e senha do Supabase.
              </p>
            </div>
          </div>

          {!authConfigured ? (
            <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
              {supabaseConfigurationError ??
                "Supabase nao esta configurado. Execute npm run setup:local."}
            </p>
          ) : null}

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-base font-semibold">
              Email
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
              Senha
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
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
