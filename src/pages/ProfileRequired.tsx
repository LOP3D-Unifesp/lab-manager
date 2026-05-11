import { AlertTriangle, LogOut } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../lib/auth";

export function ProfileRequired() {
  const { signOut, user } = useAuth();

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <Card>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-dark">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Perfil nao configurado</h1>
              <p className="mt-2 text-base leading-6 text-muted">
                Sua conta esta autenticada, mas ainda nao existe um profile ativo
                vinculado a {user?.email ?? "este usuario"}. Peça para um
                coordenador configurar seu perfil no Supabase.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
              Sair
            </Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
