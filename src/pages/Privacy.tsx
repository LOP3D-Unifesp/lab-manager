import { useEffect, useState } from "react";
import { Database, Mail, ShieldCheck, TimerReset } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/Card";
import type { PublicLabIdentity } from "../lib/domain";
import { getPublicLabIdentity } from "../lib/supabaseRepository";

export function Privacy() {
  const [lab, setLab] = useState<PublicLabIdentity | null>(null);
  useEffect(() => { getPublicLabIdentity().then(setLab).catch(() => setLab(null)); }, []);

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <article className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">{lab?.acronym ?? "Lab Manager"}</p>
        <h1 className="mt-2 text-4xl font-bold">Aviso de privacidade dos convites</h1>
        <p className="mt-4 text-lg leading-8 text-muted">Este aviso explica o tratamento mínimo de dados necessário para convidar pessoas ao sistema de {lab?.name ?? "gestão do laboratório"}.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card><Mail className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">Finalidade</h2><p className="mt-2 leading-7 text-muted">O e-mail é usado somente para entregar e controlar o convite solicitado por um coordenador ativo.</p></Card>
          <Card><Database className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">Antes do aceite</h2><p className="mt-2 leading-7 text-muted">O Supabase provisiona uma identidade técnica pendente. Não existe perfil e essa identidade não acessa os dados protegidos pelo sistema.</p></Card>
          <Card><TimerReset className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">Prazo e descarte</h2><p className="mt-2 leading-7 text-muted">O convite vale por 72 horas. Se expirar ou for revogado, a identidade incompleta é excluída e o e-mail é removido da trilha histórica.</p></Card>
          <Card><ShieldCheck className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">Após o aceite</h2><p className="mt-2 leading-7 text-muted">Somente após confirmação explícita você poderá preencher o cadastro. O acesso permanece sujeito ao papel atribuído e às políticas de segurança.</p></Card>
        </div>
        <Card className="mt-4"><h2 className="text-xl font-bold">Contato institucional</h2><p className="mt-2 leading-7 text-muted">Para dúvidas, correções ou solicitações relacionadas a este convite, escreva para {lab?.privacy_contact_email ? <a className="font-semibold text-primary underline" href={`mailto:${lab.privacy_contact_email}`}>{lab.privacy_contact_email}</a> : "o endereço indicado na mensagem do convite"}.</p><p className="mt-3 text-sm text-muted">A base legal aplicável ao tratamento deverá ser definida pela instituição responsável; este aviso não presume consentimento como base legal.</p></Card>
        <p className="mt-6"><Link className="font-semibold text-primary underline" to="/login">Voltar para a entrada</Link></p>
      </article>
    </main>
  );
}
