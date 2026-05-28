import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Mail, Users, UserPlus } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import type { Profile, ProfileRole } from "../lib/domain";
import { inviteUser, listProfiles, updateProfileRole } from "../lib/supabaseRepository";

function getRoleLabel(role: ProfileRole) {
  return role === "coordinator" ? "Coordenador" : "Pesquisador";
}

function getRoleVariant(role: ProfileRole) {
  return role === "coordinator" ? "success" : "neutral";
}

export function Administracao() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [roleError, setRoleError] = useState("");
  const [roleSuccess, setRoleSuccess] = useState("");
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const isCoordinator = profile?.role === "coordinator";

  useEffect(() => {
    carregarPerfis().catch(() => {
      setPageError("Nao foi possivel carregar os usuarios.");
    });
  }, []);

  async function carregarPerfis() {
    setPageError("");
    const profilesData = await listProfiles();
    setProfiles(profilesData);
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("Informe um email para convidar.");
      return;
    }

    try {
      await inviteUser(email);
      setInviteSuccess(`Convite enviado para ${email}.`);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Nao foi possivel enviar o convite.");
    }
  }

  async function mudarPapel(profileId: string, newRole: ProfileRole) {
    setSavingRoleId(profileId);
    setRoleError("");
    setRoleSuccess("");

    try {
      await updateProfileRole(profileId, newRole);
      await carregarPerfis();
      setRoleSuccess(
        newRole === "coordinator"
          ? "Usuario promovido a coordenador."
          : "Usuario rebaixado a pesquisador.",
      );
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Nao foi possivel atualizar o papel.");
    } finally {
      setSavingRoleId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Administração"
        description="Promova usuários, convide novos membros e mantenha o laboratório sob controle."
      />

      {pageError ? (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-4 text-base font-semibold text-danger">
          {pageError}
        </p>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,400px)_1fr]">
        <Card>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-primary-soft p-3 text-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">Convidar novo usuário</h2>
              <p className="mt-1 text-base text-muted">
                Envie um convite por email. O usuário receberá o link para completar o cadastro.
              </p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleInvite}>
            <label className="grid gap-2 text-base font-semibold text-text">
              Email
              <input
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base outline-none transition focus:border-primary"
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="usuario@exemplo.com"
                required
                type="email"
                value={inviteEmail}
              />
            </label>

            {inviteError ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                {inviteError}
              </p>
            ) : null}

            {inviteSuccess ? (
              <p className="rounded-lg border border-success bg-success-soft p-3 text-base font-semibold text-success-dark">
                {inviteSuccess}
              </p>
            ) : null}

            <Button fullWidth type="submit" disabled={!isCoordinator}>
              <UserPlus className="mr-2 h-5 w-5" aria-hidden="true" />
              Enviar convite
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-primary-soft p-3 text-primary">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">Usuários</h2>
              <p className="mt-1 text-base text-muted">
                Veja os perfis ativos e promova pesquisadores a coordenadores.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {roleError ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                {roleError}
              </p>
            ) : null}
            {roleSuccess ? (
              <p className="rounded-lg border border-success bg-success-soft p-3 text-base font-semibold text-success-dark">
                {roleSuccess}
              </p>
            ) : null}
            {profiles.length === 0 ? (
              <p className="text-base font-semibold text-muted">
                Nenhum usuário encontrado.
              </p>
            ) : (
              profiles.map((user) => (
                <div
                  key={user.id}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-bold text-text">{user.full_name}</p>
                      <p className="text-sm text-muted">{user.email}</p>
                    </div>
                    <StatusBadge
                      label={getRoleLabel(user.role)}
                      variant={getRoleVariant(user.role)}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {user.role === "researcher" ? (
                      <Button
                        className="min-h-9 px-3 py-2 text-sm"
                        onClick={() => mudarPapel(user.id, "coordinator")}
                        disabled={savingRoleId === user.id}
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />
                        Promover a coordenador
                      </Button>
                    ) : user.id !== profile?.id ? (
                      <Button
                        className="min-h-9 px-3 py-2 text-sm"
                        variant="secondary"
                        onClick={() => mudarPapel(user.id, "researcher")}
                        disabled={savingRoleId === user.id}
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4 rotate-180" aria-hidden="true" />
                        Rebaixar a pesquisador
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {!isCoordinator ? (
        <p className="mt-6 rounded-lg border border-warning bg-warning-soft p-4 text-base text-warning-dark">
          Você precisa ser coordenador para convidar novos usuários e promover pesquisadors.
        </p>
      ) : null}
    </div>
  );
}
