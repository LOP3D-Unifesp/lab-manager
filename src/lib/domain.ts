export type PeriodoId = "manha" | "tarde" | "noite";
export type ProfileRole = "coordinator" | "researcher";
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
  | "failed";

export type Profile = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: ProfileRole;
  academic_affiliation: AcademicAffiliation | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  periodo: PeriodoId;
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
  printer?: Printer | null;
  profile?: Profile | null;
  material?: Material | null;
};

export const DURACAO_MINIMA_RESERVA_MINUTOS = 30;
export const DURACAO_MAXIMA_RESERVA_MINUTOS = 24 * 60;
export const INCREMENTO_RESERVA_MINUTOS = 30;

export const periodos: Array<{
  id: PeriodoId;
  label: string;
  starts_at: string;
  ends_at: string;
  horario: string;
}> = [
  { id: "manha", label: "Manha", starts_at: "08:00", ends_at: "12:00", horario: "08:00 - 12:00" },
  { id: "tarde", label: "Tarde", starts_at: "13:00", ends_at: "17:00", horario: "13:00 - 17:00" },
  { id: "noite", label: "Noite", starts_at: "18:00", ends_at: "21:00", horario: "18:00 - 21:00" },
];

export function splitName(fullName: string) {
  const [firstName = fullName, ...lastParts] = fullName.trim().split(/\s+/);

  return {
    firstName,
    lastName: lastParts.join(" "),
  };
}

export function mapProfile(row: Omit<Profile, "first_name" | "last_name">): Profile {
  const { firstName, lastName } = splitName(row.full_name);

  return {
    ...row,
    first_name: firstName,
    last_name: lastName,
  };
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

export function periodoFromTimes(startsAt: string, endsAt: string): PeriodoId {
  return (
    periodos.find(
      (periodo) => periodo.starts_at === startsAt.slice(0, 5) && periodo.ends_at === endsAt.slice(0, 5),
    )?.id ?? "manha"
  );
}

export function reservaBloqueiaHorario(reserva: PrinterBooking) {
  return ["pending", "approved", "in_progress"].includes(reserva.status);
}

export function reservaPodeSerCancelada(reserva: PrinterBooking) {
  return ["pending", "approved"].includes(reserva.status);
}

export function getPrinterStatusLabel(status: PrinterStatus) {
  const labels: Record<PrinterStatus, string> = {
    active: "Ativa",
    maintenance: "Em manutencao",
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
    completed: "Concluida",
    cancelled: "Cancelada",
    failed: "Falhou",
  };

  return labels[status];
}
