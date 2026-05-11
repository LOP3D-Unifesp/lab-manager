import { FormEvent, useEffect, useState } from "react";
import { Save, UserRoundCog } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import type { AcademicAffiliation, ProfileRole } from "../lib/domain";
import { updateMyProfile } from "../lib/supabaseRepository";

const academicAffiliationOptions: Array<{
  value: AcademicAffiliation;
  label: string;
}> = [
  { value: "ic", label: "Iniciacao cientifica" },
  { value: "extension", label: "Extensao" },
  { value: "intern", label: "Estagio" },
  { value: "tcc", label: "TCC" },
  { value: "masters", label: "Mestrado" },
  { value: "phd", label: "Doutorado" },
  { value: "postdoc", label: "Pos-doutorado" },
  { value: "visitor", label: "Visitante" },
  { value: "technician", label: "Tecnico" },
  { value: "faculty", label: "Docente" },
  { value: "other", label: "Outro" },
];

function getRoleLabel(role: ProfileRole) {
  return role === "coordinator" ? "Coordenador" : "Pesquisador";
}

function normalizarTextoOpcional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function MeuPerfil() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [academicAffiliation, setAcademicAffiliation] = useState<
    AcademicAffiliation | ""
  >("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFullName(profile.full_name);
    setAcademicAffiliation(profile.academic_affiliation ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const nomeNormalizado = fullName.trim().replace(/\s+/g, " ");
    const telefoneNormalizado = normalizarTextoOpcional(phone);

    setErrorMessage("");
    setSuccessMessage("");

    if (nomeNormalizado.length < 3) {
      setErrorMessage("Informe um nome com pelo menos 3 caracteres.");
      return;
    }

    if (nomeNormalizado.length > 120) {
      setErrorMessage("O nome deve ter no maximo 120 caracteres.");
      return;
    }

    if (telefoneNormalizado && telefoneNormalizado.length > 40) {
      setErrorMessage("O telefone deve ter no maximo 40 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      await updateMyProfile(profile.id, {
        fullName: nomeNormalizado,
        academicAffiliation: academicAffiliation || null,
        phone: telefoneNormalizado,
      });
      await refreshProfile();
      setSuccessMessage("Perfil atualizado.");
    } catch {
      setErrorMessage("Nao foi possivel atualizar seu perfil agora.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        description="Atualize seus dados de contato usados no laboratorio."
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <div className="mb-5 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <UserRoundCog className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text">
                Dados do usuario
              </h2>
              <p className="mt-1 text-base text-muted">
                O email e o papel sao controlados pela administracao.
              </p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-base font-semibold text-text">
              Nome completo
              <input
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                disabled={submitting}
                maxLength={120}
                onChange={(event) => setFullName(event.target.value)}
                required
                value={fullName}
              />
            </label>

            <label className="grid gap-2 text-base font-semibold text-text">
              Vinculo
              <select
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                disabled={submitting}
                onChange={(event) =>
                  setAcademicAffiliation(
                    event.target.value as AcademicAffiliation | "",
                  )
                }
                value={academicAffiliation}
              >
                <option value="">Nao informado</option>
                {academicAffiliationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-base font-semibold text-text">
              Telefone
              <input
                autoComplete="tel"
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary"
                disabled={submitting}
                maxLength={40}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Opcional"
                value={phone}
              />
            </label>

            {errorMessage ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-lg border border-success bg-success-soft p-3 text-base font-semibold text-success-dark">
                {successMessage}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button disabled={submitting} type="submit">
                <Save className="mr-2 h-5 w-5" aria-hidden="true" />
                {submitting ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold text-text">Acesso</h2>
          <dl className="mt-4 grid gap-4 text-base">
            <div>
              <dt className="font-semibold text-muted">Email</dt>
              <dd className="mt-1 break-words font-bold text-text">
                {profile.email}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">Papel</dt>
              <dd className="mt-2">
                <StatusBadge label={getRoleLabel(profile.role)} variant="info" />
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
