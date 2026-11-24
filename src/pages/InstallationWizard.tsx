import { t } from "../i18n";
import { BrandMark, BrandStripe } from "../components/ui/BrandMark";
import { LanguageSelect } from "../components/ui/LanguageSelect";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { TimezoneSelect } from "../components/ui/TimezoneSelect";
import { useAuth } from "../lib/auth";
import { completeInstallation } from "../lib/supabaseRepository";

export function InstallationWizard() {
  const { refreshInstallation } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [acronym, setAcronym] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [privacyContactEmail, setPrivacyContactEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function continueToReview() {
    setErrorMessage("");
    if (
      !name.trim() ||
      !acronym.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyContactEmail.trim())
    ) {
      setErrorMessage(t("install.errRequired"));
      return;
    }
    setStep(1);
  }

  async function finish(event: FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      await completeInstallation({
        name,
        acronym,
        timezone,
        privacyContactEmail,
      });
      await refreshInstallation();
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("install.errFinish"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-text">
      <BrandStripe className="mb-8" />
      <div className="px-5 pb-8">
      <div className="mx-auto mb-4 flex w-full max-w-4xl justify-end"><LanguageSelect /></div>
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <BrandMark className="text-2xl" />
          <p className="mt-1 text-sm font-bold uppercase tracking-wide text-primary">{t("install.kicker")}</p>
          <h1 className="mt-1 text-3xl font-bold">{t("install.title")}</h1>
          <p className="mt-2 text-muted">
            {t("install.step", { step: step + 1 })}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2" aria-label={t("install.progress")}>
          {[t("install.stepIdentity"), t("install.stepReview")].map((label, index) => (
            <div key={label} className="min-w-0">
              <div className={`h-2 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`} />
              <p className="mt-2 truncate text-xs font-semibold text-muted">{label}</p>
            </div>
          ))}
        </div>

        <form onSubmit={finish}>
          <Card className="grid gap-5">
            {step === 0 ? (
              <>
                <div>
                  <h2 className="text-2xl font-bold">{t("install.identityTitle")}</h2>
                  <p className="mt-1 text-muted">
                    {t("install.identityHint")}
                  </p>
                </div>
                <label className="grid gap-2 font-semibold">
                  {t("install.fullName")}
                  <input
                    className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 font-semibold">
                    {t("install.acronym")}
                    <input
                      className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal uppercase"
                      value={acronym}
                      onChange={(event) => setAcronym(event.target.value)}
                      maxLength={20}
                      required
                    />
                  </label>
                  <label className="grid gap-2 font-semibold">
                    {t("install.timezone")}
                    <TimezoneSelect id="installation-timezone" value={timezone} onChange={setTimezone} />
                  </label>
                </div>
                <label className="grid gap-2 font-semibold">
                  {t("install.privacyContact")}
                  <input
                    className="min-h-11 rounded-lg border border-border bg-background px-4 font-normal"
                    value={privacyContactEmail}
                    onChange={(event) => setPrivacyContactEmail(event.target.value)}
                    placeholder="privacidade@instituicao.br"
                    type="email"
                    required
                  />
                  <span className="text-sm font-normal text-muted">
                    {t("install.privacyHint")}
                  </span>
                </label>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-2xl font-bold">{t("install.reviewTitle")}</h2>
                  <p className="mt-1 text-muted">
                    A conclusão configura somente a identidade inicial do laboratório.
                  </p>
                </div>
                <dl className="grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
                  <div><dt className="text-sm font-semibold text-muted">{t("install.lab")}</dt><dd className="mt-1 font-bold">{name} ({acronym.toUpperCase()})</dd></div>
                  <div><dt className="text-sm font-semibold text-muted">{t("install.timezone")}</dt><dd className="mt-1 font-bold">{timezone}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-sm font-semibold text-muted">{t("install.privacyShort")}</dt><dd className="mt-1 font-bold">{privacyContactEmail}</dd></div>
                </dl>
              </>
            )}

            {errorMessage ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button
                variant="secondary"
                disabled={step === 0 || submitting}
                onClick={() => { setErrorMessage(""); setStep(0); }}
              >
                <ChevronLeft className="mr-2 h-5 w-5" />{t("install.back")}
              </Button>
              {step === 0 ? (
                <Button key="continue" type="button" onClick={continueToReview}>
                  {t("install.continue")}<ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button key="finish" type="submit" variant="success" disabled={submitting}>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {submitting ? t("install.finishing") : t("install.finish")}
                </Button>
              )}
            </div>
          </Card>
        </form>
      </section>
      </div>
    </main>
  );
}
