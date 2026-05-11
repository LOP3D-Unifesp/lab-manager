import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Save, UserRoundCog } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import {
  periodos,
  type AcademicAffiliation,
  type PeriodoId,
  type ProfileRole,
  type WorkMode,
} from "../lib/domain";
import {
  listAvailability,
  saveProfileAvailability,
  updateMyProfile,
} from "../lib/supabaseRepository";

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

const diasDaSemana = [
  { weekday: 1, label: "Segunda" },
  { weekday: 2, label: "Terca" },
  { weekday: 3, label: "Quarta" },
  { weekday: 4, label: "Quinta" },
  { weekday: 5, label: "Sexta" },
];

type AgendaState = Record<string, WorkMode>;

function getRoleLabel(role: ProfileRole) {
  return role === "coordinator" ? "Coordenador" : "Pesquisador";
}

function getSlotKey(weekday: number, periodo: PeriodoId) {
  return `${weekday}-${periodo}`;
}

function normalizarTextoOpcional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizarCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function validarLattes(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getInputClassName() {
  return "min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary";
}

export function MeuPerfil() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [academicAffiliation, setAcademicAffiliation] = useState<
    AcademicAffiliation | ""
  >("");
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
  const [phone, setPhone] = useState("");
  const [agenda, setAgenda] = useState<AgendaState>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const horasAgendadas = useMemo(() => {
    return Object.entries(agenda).reduce((total, [key, mode]) => {
      if (mode === "aula") return total;
      const periodoId = key.split("-")[1] as PeriodoId;
      const periodo = periodos.find((p) => p.id === periodoId);
      if (!periodo) return total;
      const [startH, startM] = periodo.starts_at.split(":").map(Number);
      const [endH, endM] = periodo.ends_at.split(":").map(Number);
      return total + (endH * 60 + endM - startH * 60 - startM) / 60;
    }, 0);
  }, [agenda]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFullName(profile.full_name);
    setAcademicAffiliation(profile.academic_affiliation ?? "");
    setBirthDate(profile.birth_date ?? "");
    setIsScholarshipHolder(profile.is_scholarship_holder);
    setWeeklyWorkloadHours(profile.weekly_workload_hours?.toString() ?? "");
    setLattesUrl(profile.lattes_url ?? "");
    setCpf(profile.cpf ?? "");
    setRg(profile.rg ?? "");
    setPostalCode(profile.postal_code ?? "");
    setStreet(profile.street ?? "");
    setAddressNumber(profile.address_number ?? "");
    setAddressComplement(profile.address_complement ?? "");
    setNeighborhood(profile.neighborhood ?? "");
    setCity(profile.city ?? "");
    setState(profile.state ?? "");
    setCountry(profile.country ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  useEffect(() => {
    let ativo = true;

    if (!profile) {
      return;
    }

    listAvailability()
      .then((slots) => {
        if (!ativo) {
          return;
        }

        const agendaAtual = slots
          .filter((slot) => slot.profile_id === profile.id)
          .reduce<AgendaState>((acc, slot) => {
            acc[getSlotKey(slot.weekday, slot.periodo)] = slot.work_mode;
            return acc;
          }, {});
        setAgenda(agendaAtual);
      })
      .catch(() => {
        if (ativo) {
          setErrorMessage("Nao foi possivel carregar sua agenda.");
        }
      });

    return () => {
      ativo = false;
    };
  }, [profile]);

  function cycleSlot(weekday: number, periodoId: PeriodoId) {
    setSuccessMessage("");
    setErrorMessage("");
    const key = getSlotKey(weekday, periodoId);
    setAgenda((prev) => {
      const current = prev[key];
      if (!current) return { ...prev, [key]: "onsite" };
      if (current === "onsite") return { ...prev, [key]: "remote" };
      if (current === "remote") return { ...prev, [key]: "aula" };
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function toggleDia(weekday: number) {
    setSuccessMessage("");
    setErrorMessage("");
    setAgenda((prev) => {
      const todosMarcados = periodos.every((p) => Boolean(prev[getSlotKey(weekday, p.id)]));
      if (todosMarcados) {
        const next = { ...prev };
        periodos.forEach((p) => { delete next[getSlotKey(weekday, p.id)]; });
        return next;
      }
      const next = { ...prev };
      periodos.forEach((p) => { next[getSlotKey(weekday, p.id)] = next[getSlotKey(weekday, p.id)] ?? "onsite"; });
      return next;
    });
  }

  function togglePeriodo(periodoId: PeriodoId) {
    setSuccessMessage("");
    setErrorMessage("");
    setAgenda((prev) => {
      const todosMarcados = diasDaSemana.every((d) => Boolean(prev[getSlotKey(d.weekday, periodoId)]));
      if (todosMarcados) {
        const next = { ...prev };
        diasDaSemana.forEach((d) => { delete next[getSlotKey(d.weekday, periodoId)]; });
        return next;
      }
      const next = { ...prev };
      diasDaSemana.forEach((d) => { next[getSlotKey(d.weekday, periodoId)] = next[getSlotKey(d.weekday, periodoId)] ?? "onsite"; });
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const nomeNormalizado = fullName.trim().replace(/\s+/g, " ");
    const telefoneNormalizado = normalizarTextoOpcional(phone);
    const birthDateNormalizada = normalizarTextoOpcional(birthDate);
    const lattesNormalizado = normalizarTextoOpcional(lattesUrl);
    const cpfNormalizado = normalizarCpf(cpf);
    const rgNormalizado = normalizarTextoOpcional(rg);
    const cargaHoraria = weeklyWorkloadHours
      ? Number(weeklyWorkloadHours)
      : null;

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

    if (cpfNormalizado && cpfNormalizado.length !== 11) {
      setErrorMessage("Informe um CPF com 11 digitos ou deixe em branco.");
      return;
    }

    if (!validarLattes(lattesNormalizado)) {
      setErrorMessage("Informe uma URL valida para o Lattes.");
      return;
    }

    if (
      cargaHoraria !== null &&
      (!Number.isInteger(cargaHoraria) ||
        cargaHoraria < 1 ||
        cargaHoraria > 60)
    ) {
      setErrorMessage("A carga horaria deve estar entre 1 e 60 horas.");
      return;
    }

    setSubmitting(true);

    try {
      await updateMyProfile(profile.id, {
        fullName: nomeNormalizado,
        academicAffiliation: academicAffiliation || null,
        birthDate: birthDateNormalizada,
        isScholarshipHolder,
        weeklyWorkloadHours: cargaHoraria,
        lattesUrl: lattesNormalizado,
        cpf: cpfNormalizado,
        rg: rgNormalizado,
        postalCode: normalizarTextoOpcional(postalCode),
        street: normalizarTextoOpcional(street),
        addressNumber: normalizarTextoOpcional(addressNumber),
        addressComplement: normalizarTextoOpcional(addressComplement),
        neighborhood: normalizarTextoOpcional(neighborhood),
        city: normalizarTextoOpcional(city),
        state: normalizarTextoOpcional(state)?.toUpperCase() ?? null,
        country: normalizarTextoOpcional(country),
        phone: telefoneNormalizado,
      });
      await saveProfileAvailability(
        profile.id,
        Object.entries(agenda).map(([key, workMode]) => {
          const [weekday, periodo] = key.split("-");
          return {
            weekday: Number(weekday),
            periodo: periodo as PeriodoId,
            workMode,
          };
        }),
      );
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
        description="Atualize seus dados usados pelo laboratorio."
      />

      <form className="grid gap-5" onSubmit={handleSubmit}>
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold text-text md:col-span-2">
                Nome completo
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={120}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  value={fullName}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Data de nascimento
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  onChange={(event) => setBirthDate(event.target.value)}
                  type="date"
                  value={birthDate}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Telefone
                <input
                  autoComplete="tel"
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={40}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Opcional"
                  value={phone}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Vinculo
                <select
                  className={getInputClassName()}
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
                Carga horaria semanal
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  max={60}
                  min={1}
                  onChange={(event) =>
                    setWeeklyWorkloadHours(event.target.value)
                  }
                  placeholder="Horas"
                  type="number"
                  value={weeklyWorkloadHours}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text md:col-span-2">
                Link do Lattes
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  onChange={(event) => setLattesUrl(event.target.value)}
                  placeholder="https://lattes.cnpq.br/..."
                  type="url"
                  value={lattesUrl}
                />
              </label>

              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-background px-4 text-base font-semibold text-text md:col-span-2">
                <input
                  checked={isScholarshipHolder}
                  className="h-5 w-5 accent-primary"
                  disabled={submitting}
                  onChange={(event) =>
                    setIsScholarshipHolder(event.target.checked)
                  }
                  type="checkbox"
                />
                Bolsista
              </label>
            </div>
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
                  <StatusBadge
                    label={getRoleLabel(profile.role)}
                    variant="info"
                  />
                </dd>
              </div>
            </dl>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="text-2xl font-bold text-text">Documentos</h2>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-base font-semibold text-text">
                  CPF
                  <input
                    className={getInputClassName()}
                    disabled={submitting}
                    inputMode="numeric"
                    maxLength={14}
                    onChange={(event) => setCpf(event.target.value)}
                    value={cpf}
                  />
                </label>

                <label className="grid gap-2 text-base font-semibold text-text">
                  RG
                  <input
                    className={getInputClassName()}
                    disabled={submitting}
                    maxLength={40}
                    onChange={(event) => setRg(event.target.value)}
                    value={rg}
                  />
                </label>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-2xl font-bold text-text">Endereco</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold text-text">
                CEP
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={20}
                  onChange={(event) => setPostalCode(event.target.value)}
                  value={postalCode}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Pais
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={80}
                  onChange={(event) => setCountry(event.target.value)}
                  value={country}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text md:col-span-2">
                Rua
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={160}
                  onChange={(event) => setStreet(event.target.value)}
                  value={street}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Numero
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={20}
                  onChange={(event) => setAddressNumber(event.target.value)}
                  value={addressNumber}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Complemento
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={100}
                  onChange={(event) =>
                    setAddressComplement(event.target.value)
                  }
                  value={addressComplement}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Bairro
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={100}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  value={neighborhood}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Cidade
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={100}
                  onChange={(event) => setCity(event.target.value)}
                  value={city}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                UF
                <input
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={2}
                  onChange={(event) => setState(event.target.value)}
                  value={state}
                />
              </label>
            </div>
          </Card>
        </section>

        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-soft p-3 text-success-dark">
                <CalendarDays className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text">
                  Agenda semanal
                </h2>
                {weeklyWorkloadHours ? (
                  (() => {
                    const meta = Number(weeklyWorkloadHours);
                    const faltam = meta - horasAgendadas;
                    return (
                      <p className="mt-1 text-base font-semibold">
                        <span className={horasAgendadas > meta ? "text-danger" : "text-text"}>
                          {horasAgendadas}h agendadas de {meta}h
                        </span>
                        {faltam > 0 && (
                          <span className="text-muted"> · faltam {faltam}h</span>
                        )}
                        {faltam < 0 && (
                          <span className="text-danger"> · {Math.abs(faltam)}h acima da meta</span>
                        )}
                        {faltam === 0 && (
                          <span className="text-success-dark"> · carga completa</span>
                        )}
                      </p>
                    );
                  })()
                ) : (
                  <p className="mt-1 text-base text-muted">
                    {horasAgendadas > 0 ? `${horasAgendadas}h agendadas.` : "Nenhum horario cadastrado."}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-36 pb-2 pr-2" />
                  {diasDaSemana.map((dia) => (
                    <th key={dia.weekday} className="pb-2 text-center">
                      <button
                        className="w-full rounded-lg px-2 py-1.5 text-sm font-bold text-text transition hover:bg-background disabled:pointer-events-none"
                        disabled={submitting}
                        onClick={() => toggleDia(dia.weekday)}
                        title={`Marcar/desmarcar toda a ${dia.label}`}
                        type="button"
                      >
                        {dia.label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodos.map((periodo) => (
                  <tr key={periodo.id}>
                    <td className="pr-2 py-1">
                      <button
                        className="w-full rounded-lg px-2 py-2 text-left text-sm font-bold text-text transition hover:bg-background disabled:pointer-events-none"
                        disabled={submitting}
                        onClick={() => togglePeriodo(periodo.id)}
                        title={`Marcar/desmarcar ${periodo.label} em todos os dias`}
                        type="button"
                      >
                        <span className="block">{periodo.label}</span>
                        <span className="block text-xs font-normal text-muted">{periodo.horario}</span>
                      </button>
                    </td>
                    {diasDaSemana.map((dia) => {
                      const key = getSlotKey(dia.weekday, periodo.id);
                      const mode = agenda[key];
                      return (
                        <td key={key} className="py-1 px-1 text-center">
                          <button
                            aria-label={`${dia.label} ${periodo.label}: ${mode === "onsite" ? "Presencial" : mode === "remote" ? "Home office" : "Nao disponivel"}`}
                            className={[
                              "w-full rounded-lg border py-2 px-1 text-xs font-bold transition",
                              mode === "onsite"
                                ? "border-success bg-success-soft text-success-dark"
                                : mode === "remote"
                                  ? "border-primary bg-primary-soft text-primary"
                                  : mode === "aula"
                                    ? "border-warning bg-warning-soft text-warning-dark"
                                    : "border-border bg-background text-muted hover:border-primary hover:text-primary",
                            ].join(" ")}
                            disabled={submitting}
                            onClick={() => cycleSlot(dia.weekday, periodo.id)}
                            type="button"
                          >
                            {mode === "onsite" ? "Presencial" : mode === "remote" ? "Home office" : mode === "aula" ? "Aula" : "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-success-soft border border-success" />
                Presencial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-primary-soft border border-primary" />
                Home office
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-warning-soft border border-warning" />
                Aula
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-background border border-border" />
                Nao disponivel
              </span>
            </div>
          </div>
        </Card>

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
    </div>
  );
}
