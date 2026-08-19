import { useEffect, useState } from "react";
import { CheckCircle2, MailCheck, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { PublicLabIdentity } from "../lib/domain";
import { supabase } from "../lib/supabaseClient";
import { getPublicLabIdentity, markInvitationOpened } from "../lib/supabaseRepository";

export function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lab, setLab] = useState<PublicLabIdentity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const tokenHash = searchParams.get("token_hash") ?? "";
  const validLinkShape = Boolean(tokenHash && searchParams.get("type") === "invite");

  useEffect(() => {
    getPublicLabIdentity().then(setLab).catch(() => setLab(null));
  }, []);

  async function accept() {
    if (!supabase || !validLinkShape) return;
    setSubmitting(true);
    setError("");
    try {
      const { error: verificationError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "invite",
      });
      if (verificationError) throw verificationError;
      await markInvitationOpened();
      window.history.replaceState({}, "", "/convite/aceitar");
      navigate("/", { replace: true });
    } catch {
      await supabase.auth.signOut();
      setError("Este convite já foi usado, expirou ou foi revogado. Peça um novo convite ao laboratório.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <Card>
          <div className="flex items-start gap-3"><div className="rounded-lg bg-primary-soft p-3 text-primary"><MailCheck className="h-6 w-6" /></div><div><p className="text-sm font-bold uppercase tracking-wide text-primary">{lab?.acronym ?? "Convite"}</p><h1 className="mt-1 text-3xl font-bold">Revise antes de aceitar</h1></div></div>
          <p className="mt-6 leading-7 text-muted">Você foi convidado(a) para acessar {lab?.name ?? "o sistema do laboratório"}. Apenas abrir esta página não confirma o link, não cria perfil e não libera acesso aos dados do sistema.</p>
          <div className="mt-5 rounded-lg border border-border bg-background p-4"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-success-dark" />O convite vale por 72 horas.</p><p className="mt-2 text-sm text-muted">Ao aceitar, uma sessão será criada para você completar o cadastro. O papel já foi definido pelo coordenador que enviou o convite.</p></div>
          {!validLinkShape ? <p className="mt-5 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">O link está incompleto. Abra novamente a mensagem original ou solicite um novo convite.</p> : null}
          {error ? <p className="mt-5 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{error}</p> : null}
          <Button className="mt-6" fullWidth disabled={!validLinkShape || submitting} onClick={accept}><CheckCircle2 className="mr-2 h-5 w-5" />{submitting ? "Confirmando..." : "Aceitar convite"}</Button>
          <p className="mt-5 text-center text-sm text-muted">Leia o <Link className="font-semibold text-primary underline" to="/privacidade">aviso de privacidade</Link> ou escreva para {lab?.privacy_contact_email ? <a className="font-semibold text-primary underline" href={`mailto:${lab.privacy_contact_email}`}>{lab.privacy_contact_email}</a> : "o contato institucional informado no e-mail"}.</p>
        </Card>
      </section>
    </main>
  );
}
