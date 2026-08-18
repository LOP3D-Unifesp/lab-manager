import { AlertTriangle, LogOut, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../lib/auth";
import { createMyProfile, setMyPassword } from "../lib/supabaseRepository";
import { AcademicAffiliation } from "../lib/domain";

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

export function ProfileRequired() {
  const { signOut, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [academicAffiliation, setAcademicAffiliation] = useState<AcademicAffiliation | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [isScholarshipHolder, setIsScholarshipHolder] = useState(false);
  const [weeklyWorkloadHours, setWeeklyWorkloadHours] = useState("");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    if (!user?.email || !user.id) {
      setErrorMessage("Nao foi possivel ler o usuario autenticado.");
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("A senha deve ter pelo menos 8 caracteres.");
      setSubmitting(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage("As senhas nao coincidem.");
      setSubmitting(false);
      return;
    }

    try {
      await setMyPassword(password);
      await createMyProfile({
        fullName: fullName.trim(),
        academicAffiliation: academicAffiliation || null,
        birthDate: normalizeOptionalText(birthDate),
        isScholarshipHolder,
        weeklyWorkloadHours: weeklyWorkloadHours
          ? Number(weeklyWorkloadHours)
          : null,
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
      navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : JSON.stringify(error);

      setErrorMessage(message || "Nao foi possivel criar o perfil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-text">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col justify-center">
        <Card>
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-dark">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Complete seu cadastro</h1>
              <p className="mt-2 text-base leading-6 text-muted">
                Sua conta está autenticada, mas não existe um perfil ativo
                vinculado a {user?.email ?? "este usuário"}. Preencha os dados abaixo
                para criar seu perfil.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold">
                Email
                <input
                  className="min-h-11 rounded-lg border border-border bg-muted px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled
                  readOnly
                  type="email"
                  value={user?.email ?? ""}
                />
              </label>

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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold">
                Crie uma senha
                <input
                  autoComplete="new-password"
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold">
                Confirme a senha
                <input
                  autoComplete="new-password"
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  minLength={8}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                  type="password"
                  value={passwordConfirmation}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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
                Bolsa de estudo
                <select
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  onChange={(event) => setIsScholarshipHolder(event.target.value === "true")}
                  value={String(isScholarshipHolder)}
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-base font-semibold">
                Horas semanais
                <input
                  className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                  disabled={submitting}
                  inputMode="numeric"
                  min={1}
                  max={60}
                  onChange={(event) => setWeeklyWorkloadHours(event.target.value)}
                  placeholder="Ex: 20"
                  type="number"
                  value={weeklyWorkloadHours}
                />
              </label>

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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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
