import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Building2, Mail, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import type { PublicProfile, ProfileRole } from "../lib/domain";
import { listProfiles, updateLabSettings, updateProfileRole } from "../lib/supabaseRepository";

function getRoleLabel(role: ProfileRole) {
  return role === "coordinator" ? "Coordenador" : "Pesquisador";
}

export function Administracao() {
  const { labSettings, profile, refreshInstallation } = useAuth();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [pageError, setPageError] = useState("");
  const [roleMessage, setRoleMessage] = useState("");
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [labName, setLabName] = useState("");
  const [labAcronym, setLabAcronym] = useState("");
  const [labTimezone, setLabTimezone] = useState("America/Sao_Paulo");
  const [privacyContactEmail, setPrivacyContactEmail] = useState("");
  const [labMessage, setLabMessage] = useState("");
  const [savingLab, setSavingLab] = useState(false);

  useEffect(() => {
    listProfiles().then(setProfiles).catch(() => setPageError("Não foi possível carregar os usuários."));
  }, []);

  useEffect(() => {
    if (!labSettings) return;
    setLabName(labSettings.name ?? "");
    setLabAcronym(labSettings.acronym ?? "");
    setLabTimezone(labSettings.timezone);
    setPrivacyContactEmail(labSettings.privacy_contact_email ?? "");
  }, [labSettings]);

  async function reloadProfiles() {
    setProfiles(await listProfiles());
  }

  async function handleLabSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLabMessage("");
    setSavingLab(true);
    try {
      await updateLabSettings({
        name: labName,
        acronym: labAcronym,
        timezone: labTimezone,
        privacyContactEmail,
      });
      await refreshInstallation();
      setLabMessage("Configurações do laboratório atualizadas.");
    } catch (error) {
      setLabMessage(error instanceof Error ? error.message : "Não foi possível atualizar o laboratório.");
    } finally {
      setSavingLab(false);
    }
  }

  async function changeRole(profileId: string, role: ProfileRole) {
    setSavingRoleId(profileId);
    setRoleMessage("");
    try {
      await updateProfileRole(profileId, role);
      await reloadProfiles();
      setRoleMessage(role === "coordinator" ? "Usuário promovido a coordenador." : "Usuário alterado para pesquisador.");
    } catch (error) {
      setRoleMessage(error instanceof Error ? error.message : "Não foi possível atualizar o papel.");
    } finally {
      setSavingRoleId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Administração"
        description="Gerencie a identidade do laboratório, os convites e os papéis dos usuários."
      />

      {pageError ? <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-4 font-semibold text-danger">{pageError}</p> : null}

      <Card className="mb-4">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg bg-primary-soft p-3 text-primary"><Building2 className="h-5 w-5" /></div>
          <div>
            <h2 className="text-2xl font-bold">Laboratório</h2>
            <p className="mt-1 text-muted">Atualize a identidade e o contato institucional de privacidade.</p>
          </div>
        </div>
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1.5fr_2fr_auto] xl:items-end" onSubmit={handleLabSettings}>
          <label className="grid gap-2 font-semibold">Nome<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" required value={labName} onChange={(event) => setLabName(event.target.value)} /></label>
          <label className="grid gap-2 font-semibold">Sigla<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal uppercase" required value={labAcronym} onChange={(event) => setLabAcronym(event.target.value)} /></label>
          <label className="grid gap-2 font-semibold">Fuso horário<select className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" value={labTimezone} onChange={(event) => setLabTimezone(event.target.value)}>{["America/Sao_Paulo", "America/Manaus", "America/Recife", "America/Fortaleza", "UTC"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-2 font-semibold">Contato de privacidade<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" required type="email" value={privacyContactEmail} onChange={(event) => setPrivacyContactEmail(event.target.value)} /></label>
          <Button type="submit" disabled={savingLab}>{savingLab ? "Salvando..." : "Salvar"}</Button>
        </form>
        {labMessage ? <p className="mt-3 text-sm font-semibold text-muted">{labMessage}</p> : null}
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <Card>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-primary-soft p-3 text-primary"><Mail className="h-5 w-5" /></div>
            <div>
              <h2 className="text-2xl font-bold">Convites</h2>
              <p className="mt-1 text-muted">Envie, acompanhe, reenvie ou revogue convites com validade de 72 horas.</p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary-dark px-5 py-3 text-lg font-semibold text-white transition hover:bg-primary" to="/administracao/convites">Abrir gestão de convites</Link>
          <p className="mt-4 text-sm text-muted">Convites só são liberados quando o contato de privacidade está preenchido.</p>
        </Card>

        <Card>
          <div className="mb-5 flex items-start gap-3">
            <div className="rounded-lg bg-primary-soft p-3 text-primary"><Users className="h-5 w-5" /></div>
            <div><h2 className="text-2xl font-bold">Usuários</h2><p className="mt-1 text-muted">Perfis ativos e seus papéis atuais.</p></div>
          </div>
          {roleMessage ? <p className="mb-4 rounded-lg border border-border bg-background p-3 font-semibold text-muted">{roleMessage}</p> : null}
          <div className="grid gap-4">
            {profiles.map((user) => (
              <div key={user.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-lg font-bold">{user.full_name}</p><p className="text-sm text-muted">{user.email}</p></div>
                  <StatusBadge label={getRoleLabel(user.role)} variant={user.role === "coordinator" ? "success" : "neutral"} />
                </div>
                <div className="mt-4">
                  {user.role === "researcher" ? (
                    <Button className="min-h-9 px-3 py-2 text-sm" disabled={savingRoleId === user.id} onClick={() => changeRole(user.id, "coordinator")}><ArrowUpRight className="mr-2 h-4 w-4" />Promover a coordenador</Button>
                  ) : user.id !== profile?.id ? (
                    <Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={savingRoleId === user.id} onClick={() => changeRole(user.id, "researcher")}><ArrowUpRight className="mr-2 h-4 w-4 rotate-180" />Alterar para pesquisador</Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
