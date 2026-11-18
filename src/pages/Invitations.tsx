import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw, ShieldAlert, UserPlus, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusBadge, type StatusVariant } from "../components/ui/StatusBadge";
import type { InvitationStage, InvitationSummary, ProfileRole } from "../lib/domain";
import { appEnvironment } from "../lib/supabaseClient";
import { inviteUser, listInvitations, resendInvitation, revokeInvitation } from "../lib/supabaseRepository";

type Filter = "all" | "active" | "accepted" | "expired" | "revoked";
const stages: Record<InvitationStage, { label: string; variant: StatusVariant }> = {
  sent: { label: "Enviado", variant: "info" },
  opened: { label: "Link confirmado", variant: "warning" },
  accepted: { label: "Aceito", variant: "success" },
  expired: { label: "Expirado", variant: "neutral" },
  revoked: { label: "Revogado", variant: "danger" },
};

function roleLabel(role: ProfileRole) {
  return role === "coordinator" ? "Coordenador(a)" : "Pesquisador(a)";
}

function remainingLabel(expiresAt: string, now: number) {
  const value = new Date(expiresAt).getTime() - now;
  if (value <= 0) return "Prazo encerrado";
  return `${Math.floor(value / 3_600_000)}h ${Math.floor((value % 3_600_000) / 60_000)}min restantes`;
}

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
}

export function Invitations() {
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProfileRole>("researcher");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  async function reload() {
    setInvitations(await listInvitations());
  }

  useEffect(() => {
    reload().catch(() => setError("Não foi possível carregar os convites."));
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => invitations.filter((item) => {
    if (filter === "all") return true;
    if (filter === "active") return item.stage === "sent" || item.stage === "opened";
    return item.stage === filter;
  }), [filter, invitations]);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    try {
      await inviteUser(email, role);
      setMessage(appEnvironment === "local" ? "Convite criado. A mensagem está no Mailpit local." : "Convite enviado.");
      setEmail("");
      setRole("researcher");
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar o convite.");
    } finally {
      setCreating(false);
    }
  }

  async function runAction(item: InvitationSummary, action: "resend" | "revoke") {
    setActionId(item.id);
    setError("");
    setMessage("");
    try {
      if (action === "resend") await resendInvitation(item.id);
      else await revokeInvitation(item.id);
      setMessage(action === "resend" ? "Novo convite enviado; o link anterior foi invalidado." : "Convite revogado e dados do destinatário removidos.");
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A ação não pôde ser concluída.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <Card className="mb-5">
        <div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-primary-soft p-3 text-primary"><UserPlus className="h-5 w-5" /></div><div><h2 className="text-2xl font-bold">Novo convite</h2><p className="mt-1 text-muted">O papel fica vinculado ao convite e não pode ser alterado pelo destinatário.</p></div></div>
        <form className="grid gap-4 lg:grid-cols-[2fr_1fr_auto] lg:items-end" onSubmit={createInvitation}>
          <label className="grid gap-2 font-semibold">E-mail<input className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" required type="email" placeholder="usuario@exemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="grid gap-2 font-semibold">Papel<select className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal" value={role} onChange={(event) => setRole(event.target.value as ProfileRole)}><option value="researcher">Pesquisador(a)</option><option value="coordinator">Coordenador(a)</option></select></label>
          <Button type="submit" disabled={creating}>{creating ? "Enviando..." : "Enviar convite"}</Button>
        </form>
        {role === "coordinator" ? <p className="mt-4 rounded-lg border border-warning bg-warning-soft p-3 text-sm font-semibold text-warning-dark"><ShieldAlert className="mr-2 inline h-4 w-4" />Coordenadores podem administrar usuários, catálogos, convites e configurações.</p> : null}
        <p className="mt-4 text-sm text-muted">Validade: 72 horas. Antes do aceite não existe perfil nem acesso aos dados protegidos. <Link className="font-semibold text-primary underline" to="/privacidade">Ver aviso de privacidade</Link>.</p>
        {message ? <p className="mt-4 rounded-lg border border-success bg-success-soft p-3 font-semibold text-success-dark">{message}{appEnvironment === "local" ? <> <a className="underline" href="http://127.0.0.1:55324" target="_blank" rel="noreferrer">Abrir Mailpit</a></> : null}</p> : null}
        {error ? <p className="mt-4 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{error}</p> : null}
      </Card>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filtros de convites">
        {([['all', 'Todos'], ['active', 'Ativos'], ['accepted', 'Aceitos'], ['expired', 'Expirados'], ['revoked', 'Revogados']] as Array<[Filter, string]>).map(([value, label]) => <Button key={value} className="min-h-9 px-3 py-2 text-sm" variant={filter === value ? "primary" : "secondary"} onClick={() => setFilter(value)}>{label}</Button>)}
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? <Card><p className="text-muted">Nenhum convite neste filtro.</p></Card> : filtered.map((item) => {
          const active = item.stage === "sent" || item.stage === "opened";
          const resendAt = new Date(item.lastSentAt).getTime() + 5 * 60_000;
          return <Card key={item.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge {...stages[item.stage]} /><StatusBadge label={roleLabel(item.role)} variant={item.role === "coordinator" ? "warning" : "neutral"} /></div><h2 className="mt-3 break-all text-xl font-bold">{item.recipient}</h2><p className="mt-1 text-sm text-muted">Convidado por {item.invitedBy} · {item.sendCount} envio(s)</p>{active ? <p className="mt-3 flex items-center gap-2 font-semibold text-primary-dark"><Clock3 className="h-4 w-4" />{remainingLabel(item.expiresAt, now)}</p> : null}</div>
              {active ? <div className="flex flex-wrap gap-2"><Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={actionId === item.id || now < resendAt} title={now < resendAt ? `Disponível às ${dateTime(new Date(resendAt).toISOString())}` : undefined} onClick={() => runAction(item, "resend")}><RefreshCw className="mr-2 h-4 w-4" />Reenviar</Button><Button className="min-h-9 px-3 py-2 text-sm" variant="danger" disabled={actionId === item.id} onClick={() => runAction(item, "revoke")}><XCircle className="mr-2 h-4 w-4" />Revogar</Button></div> : null}
            </div>
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="font-semibold text-muted">Primeiro envio</dt><dd>{dateTime(item.createdAt)}</dd></div><div><dt className="font-semibold text-muted">Último envio</dt><dd>{dateTime(item.lastSentAt)}</dd></div><div><dt className="font-semibold text-muted">Link confirmado</dt><dd>{dateTime(item.openedAt)}</dd></div><div><dt className="font-semibold text-muted">Aceite concluído</dt><dd>{dateTime(item.acceptedAt)}</dd></div></dl>
          </Card>;
        })}
      </div>
    </div>
  );
}
