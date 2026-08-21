import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Save, UserRoundCog, Utensils } from "lucide-react";

import { FundingGrantsEditor } from "../components/profile/FundingGrantsEditor";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import {
  getDiaAbreviado,
  getDuracaoPeriodoEmHoras,
  getRoleLabel,
  getSlotColorClassName,
  getTotalWeeklyGrantHours,
  getWorkModeLabel,
  normalizarCpf,
  normalizarTextoOpcional,
  validarLattes,
  type AcademicAffiliation,
  type FundingGrant,
  type PeriodoId,
  type WorkMode,
} from "../lib/domain";
import { useLabSchedule } from "../lib/labSchedule";
import {
  listAvailability,
  saveProfileAvailability,
  updateMyProfile,
  uploadMyAvatar,
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

const allWeekdays = [
  { weekday: 0, label: "Domingo" },
  { weekday: 1, label: "Segunda" },
  { weekday: 2, label: "Terça" },
  { weekday: 3, label: "Quarta" },
  { weekday: 4, label: "Quinta" },
  { weekday: 5, label: "Sexta" },
  { weekday: 6, label: "Sábado" },
];

type AgendaState = Record<string, WorkMode>;

function getSlotKey(weekday: number, periodo: PeriodoId) {
  return `${weekday}|${periodo}`;
}

function getInputClassName() {
  return "min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal outline-none transition focus:border-primary";
}

export function MeuPerfil() {
  const { profile, refreshProfile } = useAuth();
  const { periodos, timeline, operatingWeekdays } = useLabSchedule();
  const diasDaSemana = allWeekdays.filter((day) => operatingWeekdays.includes(day.weekday));
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [agenda, setAgenda] = useState<AgendaState>({});
  const [mobileAgendaWeekday, setMobileAgendaWeekday] = useState(
    1,
  );
  const [allSlots, setAllSlots] = useState<Array<{ profile_id: string; weekday: number; periodo: PeriodoId; work_mode: WorkMode }>>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resumoHorasAgenda = useMemo(() => {
    const totais = {
      presencial: 0,
      homeOffice: 0,
      aula: 0,
      totalAgendado: 0,
    };

    Object.entries(agenda).forEach(([key, mode]) => {
      const periodoId = key.split("|")[1] as PeriodoId;
      const horas = getDuracaoPeriodoEmHoras(periodoId, periodos);

      if (mode === "onsite") {
        totais.presencial += horas;
        totais.totalAgendado += horas;
      }

      if (mode === "remote") {
        totais.homeOffice += horas;
        totais.totalAgendado += horas;
      }

      if (mode === "aula") {
        totais.aula += horas;
      }
    });

    return totais;
  }, [agenda, periodos]);

  const horasAgendadas = resumoHorasAgenda.totalAgendado;

  const mobileAgendaDay =
    diasDaSemana.find((dia) => dia.weekday === mobileAgendaWeekday) ??
    diasDaSemana[0] ?? allWeekdays[1];

  useEffect(() => {
    if (diasDaSemana.length > 0 && !operatingWeekdays.includes(mobileAgendaWeekday)) {
      setMobileAgendaWeekday(diasDaSemana[0].weekday);
    }
  }, [diasDaSemana, mobileAgendaWeekday, operatingWeekdays]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFullName(profile.full_name);
    setAcademicAffiliation(profile.academic_affiliation ?? "");
    setBirthDate(profile.birth_date ?? "");
    setFundingGrants(profile.funding_grants);
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
    setNationalityCountryCode(profile.nationality_country_code ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
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

        setAllSlots(slots);
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

  function countPresencial(weekday: number, periodoId: PeriodoId): number {
    const othersCount = allSlots.filter(
      (s) =>
        s.profile_id !== profile?.id &&
        s.weekday === weekday &&
        s.periodo === periodoId &&
        s.work_mode === "onsite",
    ).length;
    const myMode = agenda[getSlotKey(weekday, periodoId)];
    return othersCount + (myMode === "onsite" ? 1 : 0);
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

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setAvatarError("");
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    try {
      await uploadMyAvatar(file);
      await refreshProfile();
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Nao foi possivel enviar a foto.");
    } finally {
      setAvatarUploading(false);
    }
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
    const nationalityNormalizada =
      normalizarTextoOpcional(nationalityCountryCode)?.toUpperCase() ?? null;
    const bioNormalizada = normalizarTextoOpcional(bio);
    const cargaHoraria = totalWeeklyHours > 0 ? totalWeeklyHours : null;

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

    if (
      nationalityNormalizada &&
      !/^[A-Z]{2}$/.test(nationalityNormalizada)
    ) {
      setErrorMessage("Informe a nacionalidade com 2 letras, como BR ou CL.");
      return;
    }

    if (bioNormalizada && bioNormalizada.length > 500) {
      setErrorMessage("A bio deve ter no maximo 500 caracteres.");
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

    if (fundingGrants.some((grant) => grant.agency === "other" && !grant.agency_other?.trim())) {
      setErrorMessage("Informe o nome de cada outra agência de fomento adicionada.");
      return;
    }

    setSubmitting(true);

    try {
      await updateMyProfile({
        fullName: nomeNormalizado,
        academicAffiliation: academicAffiliation || null,
        birthDate: birthDateNormalizada,
        fundingGrants,
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
        nationalityCountryCode: nationalityNormalizada,
        phone: telefoneNormalizado,
        bio: bioNormalizada,
      });
      await saveProfileAvailability(
        profile.id,
        Object.entries(agenda).filter(([key]) => {
          const [weekday, periodo] = key.split("|");
          return operatingWeekdays.includes(Number(weekday)) && periodos.some((item) => item.id === periodo);
        }).map(([key, workMode]) => {
          const [weekday, periodo] = key.split("|");
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
    <div className="min-w-0">
      <PageHeader
        title="Meu perfil"
        description="Atualize seus dados usados pelo laboratorio."
      />

      <form className="grid min-w-0 gap-5" onSubmit={handleSubmit}>
        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="min-w-0 p-4 sm:p-5">
            <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <UserRoundCog className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-text">
                  Dados do usuario
                </h2>
                <p className="mt-1 text-base text-muted">
                  O email e o papel sao controlados pela administracao.
                </p>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-4">
              <Avatar avatarUrl={avatarPreview ?? profile?.avatar_url} name={profile?.full_name} className="h-16 w-16 text-lg" />
              <div className="grid gap-1">
                <label className="inline-flex w-fit cursor-pointer items-center rounded-lg border border-primary bg-surface px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary-soft">
                  {avatarUploading ? "Enviando..." : "Alterar foto"}
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={handleAvatarChange}
                    type="file"
                  />
                </label>
                {avatarError ? (
                  <p className="text-sm font-semibold text-danger">{avatarError}</p>
                ) : null}
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
                Nacionalidade / pais principal
                <input
                  autoCapitalize="characters"
                  className={getInputClassName()}
                  disabled={submitting}
                  maxLength={2}
                  onChange={(event) =>
                    setNationalityCountryCode(event.target.value.toUpperCase())
                  }
                  placeholder="BR"
                  value={nationalityCountryCode}
                />
              </label>

              <label className="grid gap-2 text-base font-semibold text-text">
                Carga horaria semanal
                <input
                  className="min-h-11 cursor-not-allowed rounded-lg border border-border bg-primary-soft px-4 text-base font-semibold text-text outline-none"
                  disabled
                  readOnly
                  value={`${totalWeeklyHours}h`}
                />
                <p className="text-sm font-normal text-muted">
                  Somatório automático das horas semanais das bolsas de fomento cadastradas.
                </p>
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

              <label className="grid gap-2 text-base font-semibold text-text md:col-span-2">
                Bio / resumo do pesquisador
                <textarea
                  className={`${getInputClassName()} min-h-28 py-3`}
                  disabled={submitting}
                  maxLength={500}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Resumo breve sobre sua atuacao no laboratorio."
                  value={bio}
                />
              </label>

              <div className="md:col-span-2">
                <FundingGrantsEditor value={fundingGrants} onChange={setFundingGrants} disabled={submitting} />
              </div>
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
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

        <section className="grid min-w-0 gap-5 lg:grid-cols-2">
          <Card className="min-w-0 p-4 sm:p-5">
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

          <Card className="min-w-0 p-4 sm:p-5">
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
                Pais do endereco
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

        <Card className="min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-success-soft p-3 text-success-dark">
                <CalendarDays className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-text">
                  Agenda semanal
                </h2>
                {totalWeeklyHours > 0 ? (
                  (() => {
                    const meta = totalWeeklyHours;
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
                {Object.keys(agenda).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="inline-flex min-h-7 items-center rounded-full border border-success bg-success-soft px-2.5 py-1 text-success-dark">
                      Presencial: {resumoHorasAgenda.presencial}h
                    </span>
                    <span className="inline-flex min-h-7 items-center rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-primary">
                      Home office: {resumoHorasAgenda.homeOffice}h
                    </span>
                    <span className="inline-flex min-h-7 items-center rounded-full border border-warning bg-warning-soft px-2.5 py-1 text-warning-dark">
                      Aula: {resumoHorasAgenda.aula}h
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="md:hidden">
            <div
              aria-label="Selecionar dia da agenda"
              className="mb-3 grid grid-cols-5 gap-1"
              role="tablist"
            >
              {diasDaSemana.map((dia) => {
                const selected = dia.weekday === mobileAgendaDay.weekday;
                return (
                  <button
                    aria-label={dia.label}
                    aria-selected={selected}
                    className={[
                      "min-w-0 rounded-lg border px-1 py-2 text-center text-xs font-bold leading-tight transition",
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-text hover:border-primary hover:text-primary",
                    ].join(" ")}
                    disabled={submitting}
                    key={dia.weekday}
                    onClick={() => setMobileAgendaWeekday(dia.weekday)}
                    role="tab"
                    title={dia.label}
                    type="button"
                  >
                    {getDiaAbreviado(dia.label)}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3">
              {timeline.map((item) => {
                if (item.kind === "break") {
                  return (
                    <div
                      aria-label={`${item.label}: ${item.horario}`}
                      className="flex items-center justify-center gap-2 rounded-lg border border-warning bg-warning-soft px-4 py-3 font-semibold text-warning-dark"
                      key={item.id}
                      role="separator"
                    >
                      <Utensils aria-hidden="true" className="h-4 w-4" />
                      <span>{item.label} · {item.horario}</span>
                    </div>
                  );
                }
                const periodo = item;
                const key = getSlotKey(mobileAgendaDay.weekday, periodo.id);
                const mode = agenda[key];
                const presencialCount = countPresencial(
                  mobileAgendaDay.weekday,
                  periodo.id,
                );

                return (
                  <button
                    aria-label={`${mobileAgendaDay.label} ${periodo.label}: ${getWorkModeLabel(mode)}`}
                    className={[
                      "grid min-h-20 w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                      getSlotColorClassName(mode),
                    ].join(" ")}
                    disabled={submitting}
                    key={key}
                    onClick={() =>
                      cycleSlot(mobileAgendaDay.weekday, periodo.id)
                    }
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-bold text-text">
                        {periodo.label}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-base font-bold">
                        {getWorkModeLabel(mode)}
                      </span>
                      <span className="mt-1 block text-sm font-semibold opacity-80">
                        {presencialCount} presencial
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[760px] w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-36" />
                {diasDaSemana.map((dia) => (
                  <col
                    key={dia.weekday}
                    style={{
                      width: `calc((100% - 9rem) / ${diasDaSemana.length})`,
                    }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="pb-2 pr-2" />
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
                {timeline.map((item) => {
                  if (item.kind === "break") {
                    return (
                      <tr key={item.id}>
                        <td className="py-2" colSpan={diasDaSemana.length + 1}>
                          <div
                            aria-label={`${item.label}: ${item.horario}`}
                            className="flex items-center justify-center gap-2 rounded-lg border border-warning bg-warning-soft px-4 py-2 text-sm font-semibold text-warning-dark"
                            role="separator"
                          >
                            <Utensils aria-hidden="true" className="h-4 w-4" />
                            <span>{item.label} · {item.horario}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const periodo = item;
                  return <tr key={periodo.id}>
                    <td className="pr-2 py-1">
                      <button
                        className="w-full rounded-lg px-2 py-2 text-left text-sm font-bold text-text transition hover:bg-background disabled:pointer-events-none"
                        disabled={submitting}
                        onClick={() => togglePeriodo(periodo.id)}
                        title={`Marcar/desmarcar ${periodo.label} em todos os dias`}
                        type="button"
                      >
                        <span className="block">{periodo.label}</span>
                      </button>
                    </td>
                    {diasDaSemana.map((dia) => {
                      const key = getSlotKey(dia.weekday, periodo.id);
                      const mode = agenda[key];
                      return (
                        <td key={key} className="py-1 px-1 text-center">
                          <button
                            aria-label={`${dia.label} ${periodo.label}: ${getWorkModeLabel(mode)}`}
                            className={[
                              "w-full rounded-lg border py-2 px-1 text-sm font-bold transition",
                              getSlotColorClassName(mode),
                            ].join(" ")}
                            disabled={submitting}
                            onClick={() => cycleSlot(dia.weekday, periodo.id)}
                            type="button"
                          >
                            {mode === "onsite" ? "Presencial" : mode === "remote" ? "Home office" : mode === "aula" ? "Aula" : "—"}
                            <span className="mt-0.5 block text-sm font-semibold opacity-75">
                              {countPresencial(dia.weekday, periodo.id)} presencial
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

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
