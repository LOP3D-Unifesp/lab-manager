export type PeriodoId = string;
export type ProfileRole = "coordinator" | "researcher";
export type WorkMode = "onsite" | "remote" | "aula";
export type AcademicAffiliation =
  | "ic"
  | "extension"
  | "intern"
  | "tcc"
  | "masters"
  | "phd"
  | "postdoc"
  | "visitor"
  | "technician"
  | "faculty"
  | "other";
export type FundingAgency =
  | "cnpq"
  | "fapesp"
  | "capes"
  | "sus"
  | "fap"
  | "other";

export const fundingAgencyOptions: Array<{ value: FundingAgency; label: string }> = [
  { value: "cnpq", label: "CNPq" },
  { value: "fapesp", label: "FAPESP" },
  { value: "capes", label: "CAPES" },
  { value: "sus", label: "SUS" },
  { value: "fap", label: "FAP" },
  { value: "other", label: "Outro" },
];

export function getFundingAgencyLabel(
  agency: FundingAgency | null,
  other: string | null = null,
) {
  if (!agency) return null;
  if (agency === "other") return other?.trim() || "Outra agência";
  return fundingAgencyOptions.find((option) => option.value === agency)?.label ?? agency;
}

export type FundingGrant = {
  agency: FundingAgency;
  agency_other: string | null;
  grant_name: string | null;
  weekly_hours: number | null;
  monthly_value: number | null;
};

export function hasFundingGrant(profile: { funding_grants: FundingGrant[] }) {
  return profile.funding_grants.length > 0;
}

export function getFundingGrantLabels(profile: { funding_grants: FundingGrant[] }) {
  return profile.funding_grants.map((grant) => getFundingAgencyLabel(grant.agency, grant.agency_other) ?? "");
}

export function getTotalWeeklyGrantHours(grants: FundingGrant[]) {
  return grants.reduce((total, grant) => total + (grant.weekly_hours ?? 0), 0);
}

export function getRoleLabel(role: ProfileRole) {
  return role === "coordinator" ? "Coordenador" : "Pesquisador";
}

export function normalizarTextoOpcional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizarCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function validarLattes(value: string | null) {
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

export function getWorkModeLabel(mode: WorkMode | undefined) {
  if (mode === "onsite") return "Presencial";
  if (mode === "remote") return "Home office";
  if (mode === "aula") return "Aula";
  return "-";
}

export function getSlotColorClassName(mode: WorkMode | undefined) {
  if (mode === "onsite") {
    return "border-success bg-success-soft text-success-dark";
  }

  if (mode === "remote") {
    return "border-primary bg-primary-soft text-primary";
  }

  if (mode === "aula") {
    return "border-warning bg-warning-soft text-warning-dark";
  }

  return "border-border bg-background text-muted hover:border-primary hover:text-primary";
}

export function getDuracaoPeriodoEmHoras(
  periodoId: PeriodoId,
  periodos: Array<{ id: string; starts_at: string; ends_at: string }>,
) {
  const periodo = periodos.find((item) => item.id === periodoId);
  if (!periodo) return 0;

  const [startH, startM] = periodo.starts_at.split(":").map(Number);
  const [endH, endM] = periodo.ends_at.split(":").map(Number);
  return (endH * 60 + endM - startH * 60 - startM) / 60;
}

export function getDiaAbreviado(label: string) {
  return label.slice(0, 3);
}

export function getCorDia(weekday: number) {
  return weekday % 2 === 1 ? "!bg-sky-50" : "!bg-white";
}

export function getClasseContador(total: number) {
  if (total === 0) {
    return "border-border bg-background text-muted hover:bg-surface";
  }

  if (total <= 5) {
    return "border-success bg-success-soft text-success-dark hover:bg-surface";
  }

  if (total <= 8) {
    return "border-warning-dark bg-warning text-text hover:bg-warning-soft";
  }

  return "border-danger bg-danger-soft text-danger-dark hover:bg-surface";
}

export function isSameSlot(
  a: { weekday: number; periodo: PeriodoId },
  b: { weekday: number; periodo: PeriodoId },
) {
  return a.weekday === b.weekday && a.periodo === b.periodo;
}

export type PrinterStatus =
  | "active"
  | "maintenance"
  | "unavailable"
  | "disabled";
export type BookingStatus =
  | "pending"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected"
  | "failed";

export type PublicProfile = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: ProfileRole;
  academic_affiliation: AcademicAffiliation | null;
  funding_grants: FundingGrant[];
  weekly_workload_hours: number | null;
  lattes_url: string | null;
  nationality_country_code: string | null;
  phone: string | null;
  bio: string | null;
  is_active: boolean;
  requires_booking_approval: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivateProfile = {
  profile_id: string;
  birth_date: string | null;
  cpf: string | null;
  rg: string | null;
  postal_code: string | null;
  street: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};

export type MyProfile = PublicProfile & PrivateProfile;

export type LabSettings = {
  id: boolean;
  name: string | null;
  acronym: string | null;
  timezone: string;
  workspace_capacity: number;
  operating_weekdays: number[];
  lunch_starts_at: string;
  lunch_ends_at: string;
  dinner_starts_at: string;
  dinner_ends_at: string;
  privacy_contact_email: string | null;
  setup_completed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicLabIdentity = {
  name: string;
  acronym: string;
  privacy_contact_email: string;
  invitation_ttl_hours: number;
};

export type InvitationStage = "sent" | "opened" | "accepted" | "expired" | "revoked";

export type InvitationSummary = {
  id: string;
  role: ProfileRole;
  stage: InvitationStage;
  recipient: string;
  invitedBy: string;
  createdAt: string;
  openedAt: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  lastSentAt: string;
  sendCount: number;
};

export type InstallationState = {
  settings: LabSettings | null;
  completed: boolean;
};

export type Skill = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type ProfileSkill = {
  profile_id: string;
  skill_id: string;
};

export type AvailabilitySlot = {
  id: string;
  profile_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  schedule_period_id: string;
  periodo: PeriodoId;
  work_mode: WorkMode;
};

export type Material = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type Printer = {
  id: string;
  name: string;
  model: string | null;
  location: string | null;
  status: PrinterStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PrinterMaterial = {
  printer_id: string;
  material_id: string;
};

export type PrinterBooking = {
  id: string;
  printer_id: string;
  profile_id: string;
  material_id: string;
  project_name: string;
  starts_at: string;
  ends_at: string;
  estimated_duration_minutes: number;
  status: BookingStatus;
  notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  rejected_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  printer?: Printer | null;
  profile?: PublicProfile | null;
  material?: Material | null;
  approved_by_profile?: { full_name: string } | null;
  rejected_by_profile?: { full_name: string } | null;
  cancelled_by_profile?: { full_name: string } | null;
};

export type BookingAlertSummary = {
  id: string;
  project_name: string;
  starts_at: string;
  printer_name: string;
  profile_name: string;
  status: BookingStatus;
  approved_at: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejected_by_name: string | null;
  rejected_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_by_name: string | null;
};

// Instante do evento que torna a reserva notificável para o dono:
// aprovada, rejeitada ou cancelada por outra pessoa. Retorna null quando
// nenhum desses eventos ocorreu (ex.: reserva recém-criada ou cancelada
// pelo próprio dono).
export function getEventoNotificacaoReserva(
  reserva: Pick<
    BookingAlertSummary,
    "approved_at" | "rejected_at" | "cancelled_at" | "cancelled_by"
  >,
  profileId: string,
) {
  const eventos = [
    reserva.approved_at,
    reserva.rejected_at,
    reserva.cancelled_by && reserva.cancelled_by !== profileId
      ? reserva.cancelled_at
      : null,
  ].filter((valor): valor is string => Boolean(valor));

  if (eventos.length === 0) {
    return null;
  }

  return eventos.reduce((maisRecente, atual) =>
    atual > maisRecente ? atual : maisRecente,
  );
}

export type LabSchedulePeriod = {
  id: string;
  starts_at: string;
  ends_at: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LabSchedulePeriodItem = {
  kind: "period";
  id: string;
  starts_at: string;
  ends_at: string;
  label: string;
  horario: string;
};

export type LabScheduleBreakItem = {
  kind: "break";
  id: "lunch" | "dinner";
  label: "Almoço" | "Jantar";
  starts_at: string;
  ends_at: string;
  horario: string;
};

export type LabScheduleTimelineItem = LabSchedulePeriodItem | LabScheduleBreakItem;

export type MaintenanceBlock = {
  id: string;
  printer_id: string;
  created_by: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const DURACAO_MINIMA_RESERVA_MINUTOS = 30;
export const DURACAO_MAXIMA_RESERVA_MINUTOS = 24 * 60;
export const INCREMENTO_RESERVA_MINUTOS = 30;

export function formatSchedulePeriod(startsAt: string, endsAt: string) {
  const format = (value: string) => {
    const [hour = "0", minute = "00"] = value.slice(0, 5).split(":");
    return minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;
  };
  return `${format(startsAt)}–${format(endsAt)}`;
}

export function getScheduleSortOrder(startsAt: string) {
  const [hour = 0, minute = 0] = startsAt.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export function buildLabScheduleTimeline(
  periods: LabSchedulePeriodItem[],
  breaks: LabScheduleBreakItem[],
): LabScheduleTimelineItem[] {
  return [...periods, ...breaks].sort((left, right) =>
    left.starts_at.localeCompare(right.starts_at) || left.ends_at.localeCompare(right.ends_at));
}

export function splitName(fullName: string) {
  const [firstName = fullName, ...lastParts] = fullName.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastParts.join(" "),
  };
}

export function mapPublicProfile(
  row: Omit<PublicProfile, "first_name" | "last_name">,
): PublicProfile {
  const { firstName, lastName } = splitName(row.full_name);

  return {
    ...row,
    first_name: firstName,
    last_name: lastName,
  };
}

export function mergeMyProfile(
  profile: Omit<PublicProfile, "first_name" | "last_name">,
  privateProfile: PrivateProfile,
): MyProfile {
  return { ...mapPublicProfile(profile), ...privateProfile };
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeOnly(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function criarDataLocalSegura(data: string, horario: string) {
  if (!isDateOnly(data) || !isTimeOnly(horario)) {
    return null;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);
  const dataLocal = new Date(ano, mes - 1, dia, hora, minuto);

  if (
    dataLocal.getFullYear() !== ano ||
    dataLocal.getMonth() !== mes - 1 ||
    dataLocal.getDate() !== dia ||
    dataLocal.getHours() !== hora ||
    dataLocal.getMinutes() !== minuto
  ) {
    return null;
  }

  return dataLocal;
}

export function getTimezonePadrao() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getPartesNoFuso(instante: Date, timezone: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instante);

  const obter = (tipo: string) =>
    Number(partes.find((parte) => parte.type === tipo)?.value ?? "0");

  return {
    ano: obter("year"),
    mes: obter("month"),
    dia: obter("day"),
    hora: obter("hour") % 24,
    minuto: obter("minute"),
  };
}

// Offset (ms) a somar ao instante UTC para obter o wall-time do fuso.
function getOffsetFusoMs(instante: Date, timezone: string) {
  const { ano, mes, dia, hora, minuto } = getPartesNoFuso(instante, timezone);
  const wallTimeComoUtc = Date.UTC(ano, mes - 1, dia, hora, minuto);
  return wallTimeComoUtc - (instante.getTime() - (instante.getTime() % 60000));
}

// Constrói o instante correspondente a "data + horário" interpretados no fuso
// do laboratório (e não no fuso do navegador). Retorna null para valores
// inválidos ou wall-times que não existem no fuso (ex.: lacuna de horário de
// verão), verificando via ida e volta.
export function criarDataNoFuso(data: string, horario: string, timezone: string) {
  if (!isDateOnly(data) || !isTimeOnly(horario)) {
    return null;
  }

  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);
  const estimativaUtc = Date.UTC(ano, mes - 1, dia, hora, minuto);
  const offset = getOffsetFusoMs(new Date(estimativaUtc), timezone);
  const instante = new Date(estimativaUtc - offset);

  const partes = getPartesNoFuso(instante, timezone);
  if (
    partes.ano !== ano ||
    partes.mes !== mes ||
    partes.dia !== dia ||
    partes.hora !== hora ||
    partes.minuto !== minuto
  ) {
    return null;
  }

  return instante;
}

export function getDataNoFuso(instante: Date, timezone: string) {
  const { ano, mes, dia } = getPartesNoFuso(instante, timezone);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function getHorarioNoFuso(instante: Date, timezone: string) {
  const { hora, minuto } = getPartesNoFuso(instante, timezone);
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

export function getHojeNoFuso(timezone: string) {
  return getDataNoFuso(new Date(), timezone);
}

// Gera slots de 30min cobrindo todos os turnos ativos; cai para 09:00–18:00
// quando não há turnos configurados. Sempre expande para cobrir reservas
// existentes fora da janela.
export function gerarHorariosReserva(
  periodos: Array<{ starts_at: string; ends_at: string; is_active: boolean }>,
  reservas: Array<{ starts_at: string; ends_at: string }>,
  timezone: string,
) {
  const ativos = periodos.filter((periodo) => periodo.is_active);

  let inicioMinutos = 9 * 60;
  let fimMinutos = 18 * 60;

  if (ativos.length > 0) {
    inicioMinutos = Math.min(
      ...ativos.map((periodo) => getScheduleSortOrder(periodo.starts_at)),
    );
    fimMinutos = Math.max(
      ...ativos.map((periodo) => getScheduleSortOrder(periodo.ends_at)),
    );
  }

  for (const reserva of reservas) {
    const partesInicio = getPartesNoFuso(new Date(reserva.starts_at), timezone);
    const partesFim = getPartesNoFuso(new Date(reserva.ends_at), timezone);
    inicioMinutos = Math.min(inicioMinutos, partesInicio.hora * 60 + partesInicio.minuto);
    fimMinutos = Math.max(fimMinutos, partesFim.hora * 60 + partesFim.minuto);
  }

  const horarios: string[] = [];
  for (let minuto = inicioMinutos; minuto <= fimMinutos; minuto += 30) {
    const horas = Math.floor(minuto / 60);
    const minutos = minuto % 60;
    horarios.push(`${String(horas % 24).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`);
  }

  return horarios;
}

export function calcularDuracaoMinutos(durationHours: string) {
  const duracaoHoras = Number(durationHours);
  const duracaoMinutos = duracaoHoras * 60;

  if (
    !Number.isFinite(duracaoMinutos) ||
    duracaoMinutos < DURACAO_MINIMA_RESERVA_MINUTOS ||
    duracaoMinutos > DURACAO_MAXIMA_RESERVA_MINUTOS ||
    duracaoMinutos % INCREMENTO_RESERVA_MINUTOS !== 0
  ) {
    return null;
  }

  return duracaoMinutos;
}

export function reservaBloqueiaHorario(reserva: PrinterBooking) {
  return ["pending", "approved", "in_progress"].includes(reserva.status);
}

// Reservas que "não aconteceram" (canceladas/rejeitadas) não devem ocupar a
// agenda do dia; concluídas e falhas permanecem como registro operacional.
export function reservaApareceNaAgenda(reserva: PrinterBooking) {
  return !["cancelled", "rejected"].includes(reserva.status);
}

export function intervalosSeCruzam(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && inicioB < fimA;
}

export function printerAcceptsMaterial(
  printerMaterials: PrinterMaterial[],
  printerId: string,
  materialId: string,
) {
  return printerMaterials.some(
    (item) => item.printer_id === printerId && item.material_id === materialId,
  );
}

export function findConflictingBooking(
  bookings: PrinterBooking[],
  inicio: Date,
  fim: Date,
  excludeBookingId?: string | null,
) {
  return (
    bookings.find((reserva) => {
      return (
        reserva.id !== excludeBookingId &&
        reservaBloqueiaHorario(reserva) &&
        intervalosSeCruzam(inicio, fim, new Date(reserva.starts_at), new Date(reserva.ends_at))
      );
    }) ?? null
  );
}

export function findConflictingMaintenanceBlock(
  blocks: MaintenanceBlock[],
  inicio: Date,
  fim: Date,
) {
  return (
    blocks.find((block) =>
      intervalosSeCruzam(inicio, fim, new Date(block.starts_at), new Date(block.ends_at)),
    ) ?? null
  );
}

export function reservaPodeSerCancelada(reserva: PrinterBooking) {
  return ["pending", "approved"].includes(reserva.status);
}

export function reservaPodeSerEditada(reserva: PrinterBooking) {
  return ["pending", "approved"].includes(reserva.status);
}

export const RESERVA_CORES = [
  "border-blue-400 bg-blue-100 text-blue-950",
  "border-rose-400 bg-rose-100 text-rose-950",
  "border-lime-500 bg-lime-100 text-lime-950",
  "border-indigo-400 bg-indigo-100 text-indigo-950",
  "border-amber-500 bg-amber-100 text-amber-950",
  "border-cyan-500 bg-cyan-100 text-cyan-950",
  "border-violet-400 bg-violet-100 text-violet-950",
  "border-orange-500 bg-orange-100 text-orange-950",
  "border-emerald-500 bg-emerald-100 text-emerald-950",
  "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-950",
];

export function getCorReserva(id: string) {
  const hash = id.split("").reduce((total, caractere) => {
    return total * 31 + caractere.charCodeAt(0);
  }, 7);

  return RESERVA_CORES[Math.abs(hash) % RESERVA_CORES.length];
}

export function getMensagemErroReserva(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  const mensagens: Array<[string, string]> = [
    ["booking_conflict", "A impressora já possui uma reserva nesse intervalo."],
    ["maintenance_conflict", "A impressora está em manutenção nesse intervalo."],
    ["incompatible_material", "O material selecionado não é compatível com a impressora."],
    ["printer_unavailable", "A impressora selecionada não está ativa."],
    ["printer_not_found", "Impressora não encontrada."],
    ["invalid_start_time", "Escolha um horário futuro para a reserva."],
    ["booking_not_editable", "Somente reservas pendentes ou aprovadas podem ser editadas."],
    ["invalid_booking_status_transition", "Essa mudança de status não é permitida."],
    ["booking_not_started", "A reserva ainda não começou; aguarde o horário de início."],
    ["booking_not_cancellable", "Somente reservas pendentes ou aprovadas podem ser canceladas."],
    ["active_profile_required", "É necessário um perfil ativo para realizar essa operação."],
    ["booking_forbidden", "Você não tem permissão para gerenciar essa reserva."],
    ["coordinator_required", "Apenas o coordenador pode realizar essa operação."],
    ["project_name_required", "Informe o nome da impressão."],
    ["invalid_duration", "A duração deve ser entre 0,5h e 24h em passos de 0,5h."],
    ["invalid_interval", "Informe um intervalo válido (início antes do fim)."],
    ["reason_required", "Informe o motivo da manutenção."],
    ["booking_not_found", "Reserva não encontrada."],
  ];

  const correspondente = mensagens.find(([codigo]) => message.includes(codigo));
  if (correspondente) {
    return correspondente[1];
  }

  return message || "Não foi possível salvar a reserva.";
}

export function getProximosStatusReserva(status: BookingStatus): BookingStatus[] {
  const transitions: Record<BookingStatus, BookingStatus[]> = {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["in_progress", "cancelled"],
    in_progress: ["completed", "failed"],
    completed: [],
    cancelled: [],
    rejected: [],
    failed: [],
  };

  return transitions[status];
}

export function getPrinterStatusLabel(status: PrinterStatus) {
  const labels: Record<PrinterStatus, string> = {
    active: "Ativa",
    maintenance: "Em manutenção",
    unavailable: "Indisponivel",
    disabled: "Desativada",
  };

  return labels[status];
}

export function getBookingStatusLabel(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    pending: "Pendente",
    approved: "Aprovada",
    in_progress: "Em andamento",
    completed: "Concluída",
    cancelled: "Cancelada",
    rejected: "Rejeitada",
    failed: "Falhou",
  };

  return labels[status];
}
