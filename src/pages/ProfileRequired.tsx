import { AlertTriangle, LogOut, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FundingGrantsEditor } from "../components/profile/FundingGrantsEditor";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useAuth } from "../lib/auth";
import { createMyProfile, setMyPassword } from "../lib/supabaseRepository";
import { AcademicAffiliation, getTotalWeeklyGrantHours, type FundingGrant } from "../lib/domain";

const academicAffiliationOptions: Array<{
  value: AcademicAffiliation;
  label: string;
}> = [
  { value: "ic", label: "Iniciação científica" },
  { value: "extension", label: "Extensão" },
  { value: "intern", label: "Estágio" },
  { value: "tcc", label: "TCC" },
  { value: "masters", label: "Mestrado" },
  { value: "phd", label: "Doutorado" },
  { value: "postdoc", label: "Pós-doutorado" },
  { value: "visitor", label: "Visitante" },
  { value: "technician", label: "Técnico" },
  { value: "faculty", label: "Docente" },
  { value: "other", label: "Outro" },
];

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function extractErrorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : JSON.stringify(error);

  return message || fallback;
}

export function ProfileRequired() {
  const { signOut, user, refreshProfile, refreshInstallation } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"account" | "profile">("account");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [fullName, setFullName] = useState("");
  const [academicAffiliation, setAcademicAffiliation] = useState<
    AcademicAffiliation | ""
  >("");
  const [birthDate, setBirthDate] = useState("");
  const [fundingGrants, setFundingGrants] = useState<FundingGrant[]>([]);
  const totalWeeklyHours = getTotalWeeklyGrantHours(fundingGrants);
  const [lattesUrl, setLattesUrl] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [nationalityCountryCode, setNationalityCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");

    if (password.length < 8) {
      setAccountError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== passwordConfirmation) {
      setAccountError("As senhas nao coincidem.");
      return;
    }

    setAccountSubmitting(true);

    try {
      await setMyPassword(password);
      setStep("profile");
    } catch (error) {
      setAccountError(extractErrorMessage(error, "Nao foi possivel definir a senha."));
    } finally {
      setAccountSubmitting(false);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    if (!user?.email || !user.id) {
      setErrorMessage("Nao foi possivel ler o usuario autenticado.");
      setSubmitting(false);
      return;
    }

    if (fundingGrants.some((grant) => grant.agency === "other" && !grant.agency_other?.trim())) {
      setErrorMessage("Informe o nome de cada outra agência de fomento adicionada.");
      setSubmitting(false);
      return;
    }

    try {
      await createMyProfile({
        fullName: fullName.trim(),
        academicAffiliation: academicAffiliation || null,
        birthDate: normalizeOptionalText(birthDate),
        fundingGrants,
        weeklyWorkloadHours: totalWeeklyHours > 0 ? totalWeeklyHours : null,
        lattesUrl: normalizeOptionalText(lattesUrl),
        cpf: normalizeCpf(cpf),
        rg: normalizeOptionalText(rg),
        postalCode: normalizeOptionalText(postalCode),
        street: normalizeOptionalText(street),
        addressNumber: normalizeOptionalText(addressNumber),
        addressComplement: normalizeOptionalText(addressComplement),
        neighborhood: normalizeOptionalText(neighborhood),
        city: normalizeOptionalText(city),
        state: normalizeOptionalText(state),
        country: normalizeOptionalText(country),
        nationalityCountryCode: normalizeOptionalText(nationalityCountryCode)?.toUpperCase() ?? null,
        phone: normalizeOptionalText(phone),
        bio: normalizeOptionalText(bio),
      });

      await refreshProfile();
      await refreshInstallation();
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "Nao foi possivel criar o perfil."));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "account") {
    return (
      <main className="min-h-screen bg-background px-5 py-8 text-text">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center">
          <Card>
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-dark">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Crie sua conta</h1>
                <p className="mt-2 text-base leading-6 text-muted">
                  Sua conta está autenticada como {user?.email ?? "este usuário"}.
                  Defina uma senha para continuar.
                </p>
              </div>
            </div>

            <form className="mt-6 grid gap-6" onSubmit={handleAccountSubmit}>
              <label className="grid gap-2 text-base font-semibold">
                Email
                <input
                  className="min-h-11 cursor-not-allowed rounded-lg border border-border bg-primary-soft px-4 text-base font-semibold text-text opacity-100 outline-none disabled:opacity-100"
                  disabled
                  readOnly
                  type="email"
                  value={user?.email ?? ""}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-base font-semibold">
                  Crie uma senha
                  <PasswordInput
                    autoComplete="new-password"
                    disabled={accountSubmitting}
                    minLength={8}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    value={password}
                  />
                </label>

                <label className="grid gap-2 text-base font-semibold">
                  Confirme a senha
                  <PasswordInput
                    autoComplete="new-password"
                    disabled={accountSubmitting}
                    minLength={8}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    required
                    value={passwordConfirmation}
                  />
                </label>
              </div>

              {accountError ? (
                <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                  {accountError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <Button disabled={accountSubmitting} fullWidth type="submit">
                  {accountSubmitting ? "Salvando..." : "Continuar"}
                </Button>

                <Button disabled={accountSubmitting} variant="secondary" onClick={signOut}>
                  <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                  Sair
                </Button>
              </div>
            </form>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col justify-center">
        <Card>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-dark">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Complete seu perfil</h1>
              <p className="mt-2 text-base leading-6 text-muted">
                Falta só preencher seus dados para começar a usar o laboratório.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-6" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold">
                Nome completo
                <input
                  autoComplete="name"
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Seu nome completo"
                  required
                  type="text"
                  value={fullName}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Vinculação acadêmica
                <select
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setAcademicAffiliation(event.target.value as AcademicAffiliation | "")}
                  value={academicAffiliation}
                >
                  <option value="">Selecione (opcional)</option>
                  {academicAffiliationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold">
                Data de nascimento
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setBirthDate(event.target.value)}
                  type="date"
                  value={birthDate}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Horas semanais
                <input
                  className="min-h-11 cursor-not-allowed rounded-lg border border-border bg-primary-soft px-4 text-base font-semibold text-text outline-none"
                  disabled
                  readOnly
                  value={`${totalWeeklyHours}h`}
                />
                <p className="text-sm font-normal text-muted">
                  Somatório automático das horas semanais das bolsas cadastradas abaixo.
                </p>
              </label>
            </div>

            <FundingGrantsEditor value={fundingGrants} onChange={setFundingGrants} disabled={submitting} />

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-base font-semibold">
                Lattes URL
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setLattesUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={lattesUrl}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                CPF
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setCpf(event.target.value)}
                  placeholder="Somente números"
                  type="text"
                  value={cpf}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                RG
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setRg(event.target.value)}
                  type="text"
                  value={rg}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-base font-semibold">
                Telefone
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setPhone(event.target.value)}
                  type="tel"
                  value={phone}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Nacionalidade (código)
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setNationalityCountryCode(event.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="BR"
                  type="text"
                  value={nationalityCountryCode}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                CEP
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setPostalCode(event.target.value)}
                  type="text"
                  value={postalCode}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold">
                Rua
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setStreet(event.target.value)}
                  type="text"
                  value={street}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Número
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setAddressNumber(event.target.value)}
                  type="text"
                  value={addressNumber}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-base font-semibold">
                Complemento
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setAddressComplement(event.target.value)}
                  type="text"
                  value={addressComplement}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Bairro
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  type="text"
                  value={neighborhood}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Cidade
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setCity(event.target.value)}
                  type="text"
                  value={city}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold">
                Estado
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setState(event.target.value)}
                  type="text"
                  value={state}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                País
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setCountry(event.target.value)}
                  type="text"
                  value={country}
                />
              </label>
            </div>

            <label className="grid gap-2 text-base font-semibold">
              Biografia
              <textarea
                className="min-h-[8rem] rounded-lg border border-border bg-background px-4 py-3 text-base font-normal outline-none transition focus:border-primary"
                disabled={submitting}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Conte um pouco sobre você."
                value={bio}
              />
            </label>

            {errorMessage ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button disabled={submitting} fullWidth type="submit">
                <UserPlus className="mr-2 h-5 w-5" aria-hidden="true" />
                {submitting ? "Salvando..." : "Criar perfil"}
              </Button>

              <Button disabled={submitting} variant="secondary" onClick={signOut}>
                <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                Sair
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </main>
  );
}
