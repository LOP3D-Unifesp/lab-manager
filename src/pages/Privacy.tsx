import { t } from "../i18n";
import { BrandMark, BrandStripe } from "../components/ui/BrandMark";
import { LanguageSelect } from "../components/ui/LanguageSelect";
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
    <main className="min-h-screen bg-background text-text">
      <BrandStripe className="mb-8" />
      <div className="px-5 pb-8">
      <div className="mx-auto mb-4 flex w-full max-w-3xl justify-end"><LanguageSelect /></div>
      <article className="mx-auto w-full max-w-3xl">
        <BrandMark className="text-3xl" text={lab?.acronym ?? "Lab Manager"} />
        <h1 className="mt-2 text-4xl font-bold">{t("privacy.title")}</h1>
        <p className="mt-4 text-lg leading-8 text-muted">{t("privacy.intro", { lab: lab?.name ?? t("privacy.labFallback") })}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card><Mail className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">{t("privacy.purposeTitle")}</h2><p className="mt-2 leading-7 text-muted">{t("privacy.purposeBody")}</p></Card>
          <Card><Database className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">{t("privacy.beforeTitle")}</h2><p className="mt-2 leading-7 text-muted">{t("privacy.beforeBody")}</p></Card>
          <Card><TimerReset className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">{t("privacy.deadlineTitle")}</h2><p className="mt-2 leading-7 text-muted">{t("privacy.deadlineBody")}</p></Card>
          <Card><ShieldCheck className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-bold">{t("privacy.afterTitle")}</h2><p className="mt-2 leading-7 text-muted">{t("privacy.afterBody")}</p></Card>
        </div>
        <Card className="mt-4"><h2 className="text-xl font-bold">{t("privacy.contactTitle")}</h2><p className="mt-2 leading-7 text-muted">{t("privacy.contactBody")} {lab?.privacy_contact_email ? <a className="font-semibold text-primary underline" href={`mailto:${lab.privacy_contact_email}`}>{lab.privacy_contact_email}</a> : t("privacy.contactFallback")}.</p><p className="mt-3 text-sm text-muted">{t("privacy.legalBasis")}</p></Card>
        <p className="mt-6"><Link className="font-semibold text-primary underline" to="/login">{t("privacy.backToLogin")}</Link></p>
      </article>
      </div>
    </main>
  );
}
