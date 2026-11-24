import { t } from "../i18n";
import { BrandMark, BrandStripe } from "../components/ui/BrandMark";
import { LabLogo } from "../components/ui/LabLogo";
import { LanguageSelect } from "../components/ui/LanguageSelect";
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
      window.history.replaceState({}, "", `${import.meta.env.BASE_URL.replace(/\/$/, "")}/convite/aceitar`);
      navigate("/", { replace: true });
    } catch {
      await supabase.auth.signOut();
      setError(t("accept.errUsed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-text">
      <BrandStripe className="mb-8" />
      <div className="px-5 pb-8">
      <div className="mx-auto flex w-full max-w-xl justify-end"><LanguageSelect /></div>
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
        <Card>
          <div className="flex items-start gap-3"><div className="rounded-lg bg-primary-soft p-3 text-primary"><MailCheck className="h-6 w-6" /></div><div><LabLogo alt={lab?.name ?? t("logo.alt")} className="h-12 max-w-[12rem]" favicon fallback={<BrandMark className="text-2xl" text={lab?.acronym ?? t("accept.fallbackLab")} />} logos={lab} /><h1 className="mt-1 text-3xl font-bold">{t("accept.title")}</h1></div></div>
          <p className="mt-6 leading-7 text-muted">{t("accept.intro", { lab: lab?.name ?? t("accept.labFallback") })}</p>
          <div className="mt-5 rounded-lg border border-border bg-background p-4"><p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-success-dark" />{t("accept.validity")}</p><p className="mt-2 text-sm text-muted">{t("accept.afterHint")}</p></div>
          {!validLinkShape ? <p className="mt-5 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{t("accept.incompleteLink")}</p> : null}
          {error ? <p className="mt-5 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{error}</p> : null}
          <Button className="mt-6" fullWidth disabled={!validLinkShape || submitting} onClick={accept}><CheckCircle2 className="mr-2 h-5 w-5" />{submitting ? t("accept.confirming") : t("accept.button")}</Button>
          <p className="mt-5 text-center text-sm text-muted">{t("accept.read")} <Link className="font-semibold text-primary underline" to="/privacidade">{t("accept.privacyLink")}</Link> {t("accept.orWrite")} {lab?.privacy_contact_email ? <a className="font-semibold text-primary underline" href={`mailto:${lab.privacy_contact_email}`}>{lab.privacy_contact_email}</a> : t("accept.contactFallback")}.</p>
        </Card>
      </section>
      </div>
    </main>
  );
}
