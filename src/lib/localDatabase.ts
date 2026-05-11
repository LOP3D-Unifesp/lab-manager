export type PeriodoId = "manha" | "tarde" | "noite";
export type LocalProfileRole = "coordinator" | "researcher";
export type LocalPrinterStatus =
  | "Ativa"
  | "Em manutencao"
  | "Indisponivel"
  | "Desativada";
export type LocalBookingStatus =
  | "Pendente"
  | "Aprovada"
  | "Em andamento"
  | "Concluida"
  | "Cancelada"
  | "Falhou";

export type LocalProfile = {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  academic_affiliation: string;
  presence_status: string;
  email?: string;
  phone?: string;
  skills?: string[];
  role: LocalProfileRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LocalAvailabilitySlot = {
  id: string;
  profile_id: string;
  weekday: number;
  periodo: PeriodoId;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type LocalPrinter = {
  id: string;
  name: string;
  model: string;
  brand: string;
  dimensions: string;
  allowed_filaments: string[];
  status: LocalPrinterStatus;
  created_at: string;
  updated_at: string;
};

export type LocalPrintReservation = {
  id: string;
  printer_id: string;
  profile_id?: string;
  print_name: string;
  material: string;
  estimated_time: string;
  duration_minutes?: number;
  reservation_date?: string;
  starts_at?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
  status: LocalBookingStatus;
  created_at: string;
  updated_at: string;
};

export type LocalDatabase = {
  schema_version: 1;
  profiles: LocalProfile[];
  availability_slots: LocalAvailabilitySlot[];
  printers: LocalPrinter[];
  print_reservations: LocalPrintReservation[];
};

const API_URL = "/api/local-database";
const STORAGE_KEY = "lab-manager:local-database-cache";
const STORAGE_DIRTY_KEY = "lab-manager:local-database-cache-dirty";
const STORAGE_EVENT = "lab-manager:local-database-atualizado";
export const DURACAO_MINIMA_RESERVA_MINUTOS = 30;
export const DURACAO_MAXIMA_RESERVA_MINUTOS = 24 * 60;
export const INCREMENTO_RESERVA_MINUTOS = 30;

const periodosValidos = ["manha", "tarde", "noite"] as const;
const bookingStatusMap: Record<string, LocalBookingStatus> = {
  pending: "Pendente",
  approved: "Aprovada",
  in_progress: "Em andamento",
  completed: "Concluida",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  failed: "Falhou",
  Pendente: "Pendente",
  Aprovada: "Aprovada",
  "Em andamento": "Em andamento",
  Concluida: "Concluida",
  Concluída: "Concluida",
  Cancelada: "Cancelada",
  Falhou: "Falhou",
};
const printerStatusMap: Record<string, LocalPrinterStatus> = {
  active: "Ativa",
  maintenance: "Em manutencao",
  unavailable: "Indisponivel",
  disabled: "Desativada",
  Ativa: "Ativa",
  "Em manutencao": "Em manutencao",
  "Em manutenção": "Em manutencao",
  Indisponivel: "Indisponivel",
  Indisponível: "Indisponivel",
  Desativada: "Desativada",
};

const horariosPorPeriodo: Record<
  PeriodoId,
  { starts_at: string; ends_at: string }
> = {
  manha: { starts_at: "08:00", ends_at: "12:00" },
  tarde: { starts_at: "13:00", ends_at: "17:00" },
  noite: { starts_at: "18:00", ends_at: "21:00" },
};

const databaseInicial: LocalDatabase = {
  schema_version: 1,
  profiles: [],
  availability_slots: [],
  printers: [],
  print_reservations: [],
};

function agora() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function asRole(value: unknown): LocalProfileRole {
  return value === "coordinator" ? "coordinator" : "researcher";
}

function normalizarPrinterStatus(value: unknown): LocalPrinterStatus {
  if (typeof value !== "string") {
    return "Ativa";
  }

  return printerStatusMap[value] ?? "Ativa";
}

function normalizarBookingStatus(value: unknown): LocalBookingStatus {
  if (typeof value !== "string") {
    return "Pendente";
  }

  return bookingStatusMap[value] ?? "Pendente";
}

function isIsoDateString(value: unknown) {
  if (typeof value !== "string" || !value) {
    return false;
  }

  return Number.isFinite(new Date(value).getTime());
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTimeOnly(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizarPeriodo(value: unknown): PeriodoId | null {
  return periodosValidos.includes(value as PeriodoId)
    ? (value as PeriodoId)
    : null;
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

function criarDataLocal(data: string, horario: string) {
  return criarDataLocalSegura(data, horario) ?? new Date(Number.NaN);
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

export function reservaBloqueiaHorario(reserva: LocalPrintReservation) {
  return ["Pendente", "Aprovada", "Em andamento"].includes(reserva.status);
}

export function reservaPodeSerCancelada(reserva: LocalPrintReservation) {
  return ["Pendente", "Aprovada"].includes(reserva.status);
}

function normalizarReserva(reserva: unknown): LocalPrintReservation | null {
  if (!isRecord(reserva)) {
    return null;
  }

  const id = asString(reserva.id);
  const printerId = asString(reserva.printer_id);
  const printName = asString(reserva.print_name);
  const material = asString(reserva.material);

  if (!id || !printerId || !printName || !material) {
    return null;
  }

  const reservationDate = asString(reserva.reservation_date);
  const startsAt = asString(reserva.starts_at);
  const existingScheduledStart = asString(reserva.scheduled_start_at);
  const existingScheduledEnd = asString(reserva.scheduled_end_at);
  const hasValidScheduledRange =
    isIsoDateString(existingScheduledStart) && isIsoDateString(existingScheduledEnd);

  if (hasValidScheduledRange) {
    const inicio = new Date(existingScheduledStart);
    const fim = new Date(existingScheduledEnd);

    if (inicio < fim) {
      return {
        id,
        printer_id: printerId,
        profile_id: asString(reserva.profile_id) || undefined,
        print_name: printName,
        material,
        estimated_time: asString(reserva.estimated_time),
        duration_minutes:
          typeof reserva.duration_minutes === "number" &&
          Number.isFinite(reserva.duration_minutes)
            ? reserva.duration_minutes
            : Math.round((fim.getTime() - inicio.getTime()) / 60000),
        reservation_date: reservationDate || undefined,
        starts_at: startsAt || undefined,
        scheduled_start_at: inicio.toISOString(),
        scheduled_end_at: fim.toISOString(),
        status: normalizarBookingStatus(reserva.status),
        created_at: isIsoDateString(reserva.created_at)
          ? asString(reserva.created_at)
          : agora(),
        updated_at: isIsoDateString(reserva.updated_at)
          ? asString(reserva.updated_at)
          : agora(),
      };
    }
  }

  if (
    !reservationDate ||
    !startsAt ||
    !isDateOnly(reservationDate) ||
    !isTimeOnly(startsAt)
  ) {
    return null;
  }

  const inicio = criarDataLocal(reservationDate, startsAt);
  const minutos =
    typeof reserva.duration_minutes === "number" &&
    Number.isFinite(reserva.duration_minutes)
      ? reserva.duration_minutes
      : typeof reserva.estimated_time === "string"
        ? Number.parseFloat(reserva.estimated_time.replace(",", ".")) * 60
        : Number.NaN;

  if (
    !Number.isFinite(inicio.getTime()) ||
    !Number.isFinite(minutos) ||
    minutos <= 0
  ) {
    return null;
  }

  return {
    id,
    printer_id: printerId,
    profile_id: asString(reserva.profile_id) || undefined,
    print_name: printName,
    material,
    estimated_time: asString(reserva.estimated_time),
    duration_minutes: minutos,
    reservation_date: reservationDate,
    starts_at: startsAt,
    scheduled_start_at: inicio.toISOString(),
    scheduled_end_at: new Date(
      inicio.getTime() + minutos * 60 * 1000,
    ).toISOString(),
    status: normalizarBookingStatus(reserva.status),
    created_at: isIsoDateString(reserva.created_at)
      ? asString(reserva.created_at)
      : agora(),
    updated_at: isIsoDateString(reserva.updated_at)
      ? asString(reserva.updated_at)
      : agora(),
  } satisfies LocalPrintReservation;
}

function normalizarProfile(profile: unknown): LocalProfile | null {
  if (!isRecord(profile)) {
    return null;
  }

  const id = asString(profile.id);
  const firstName = asString(profile.first_name);
  const lastName = asString(profile.last_name);
  const fullName =
    asString(profile.full_name) || `${firstName} ${lastName}`.trim();

  if (!id || !fullName) {
    return null;
  }

  return {
    id,
    full_name: fullName,
    first_name: firstName || fullName.split(" ")[0] || fullName,
    last_name: lastName || fullName.split(" ").slice(1).join(" "),
    academic_affiliation: asString(profile.academic_affiliation),
    presence_status:
      asString(profile.presence_status) === "Remoto"
        ? "Remoto"
        : "No laboratorio",
    email: asString(profile.email),
    phone: asString(profile.phone),
    skills: asStringArray(profile.skills),
    role: asRole(profile.role),
    is_active: asBoolean(profile.is_active, true),
    created_at: isIsoDateString(profile.created_at)
      ? asString(profile.created_at)
      : agora(),
    updated_at: isIsoDateString(profile.updated_at)
      ? asString(profile.updated_at)
      : agora(),
  };
}

function normalizarAvailabilitySlot(slot: unknown): LocalAvailabilitySlot | null {
  if (!isRecord(slot)) {
    return null;
  }

  const periodo = normalizarPeriodo(slot.periodo);
  const id = asString(slot.id);
  const profileId = asString(slot.profile_id);
  const weekday = typeof slot.weekday === "number" ? slot.weekday : Number.NaN;

  if (
    !id ||
    !profileId ||
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6 ||
    !periodo
  ) {
    return null;
  }

  const horario = horariosPorPeriodo[periodo];

  return {
    id,
    profile_id: profileId,
    weekday,
    periodo,
    starts_at: isTimeOnly(asString(slot.starts_at))
      ? asString(slot.starts_at)
      : horario.starts_at,
    ends_at: isTimeOnly(asString(slot.ends_at))
      ? asString(slot.ends_at)
      : horario.ends_at,
    created_at: isIsoDateString(slot.created_at) ? asString(slot.created_at) : agora(),
    updated_at: isIsoDateString(slot.updated_at) ? asString(slot.updated_at) : agora(),
  };
}

function normalizarPrinter(printer: unknown): LocalPrinter | null {
  if (!isRecord(printer)) {
    return null;
  }

  const id = asString(printer.id);
  const name = asString(printer.name).trim();

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    model: asString(printer.model),
    brand: asString(printer.brand),
    dimensions: asString(printer.dimensions),
    allowed_filaments: asStringArray(printer.allowed_filaments),
    status: normalizarPrinterStatus(printer.status),
    created_at: isIsoDateString(printer.created_at)
      ? asString(printer.created_at)
      : agora(),
    updated_at: isIsoDateString(printer.updated_at)
      ? asString(printer.updated_at)
      : agora(),
  };
}

function normalizarDatabase(database: Partial<LocalDatabase> | unknown): LocalDatabase {
  const origem = isRecord(database) ? database : {};

  return {
    schema_version: 1,
    profiles: Array.isArray(origem.profiles)
      ? origem.profiles.map(normalizarProfile).filter(isNotNull)
      : [],
    availability_slots: Array.isArray(origem.availability_slots)
      ? origem.availability_slots
          .map(normalizarAvailabilitySlot)
          .filter(isNotNull)
      : [],
    printers: Array.isArray(origem.printers)
      ? origem.printers.map(normalizarPrinter).filter(isNotNull)
      : [],
    print_reservations: Array.isArray(origem.print_reservations)
      ? origem.print_reservations.map(normalizarReserva).filter(isNotNull)
      : [],
  };
}

function lerCacheLocal() {
  if (typeof window === "undefined") {
    return databaseInicial;
  }

  const databaseSalvo = window.localStorage.getItem(STORAGE_KEY);

  if (!databaseSalvo) {
    return databaseInicial;
  }

  try {
    return normalizarDatabase(
      JSON.parse(databaseSalvo) as Partial<LocalDatabase>,
    );
  } catch {
    return databaseInicial;
  }
}

function cacheLocalTemAlteracaoPendente() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(STORAGE_DIRTY_KEY) === "true";
}

function marcarCacheLocalPendente(pendente: boolean) {
  window.localStorage.setItem(STORAGE_DIRTY_KEY, String(pendente));
}

function salvarCacheLocal(database: LocalDatabase) {
  const proximoCache = JSON.stringify(database);

  if (window.localStorage.getItem(STORAGE_KEY) !== proximoCache) {
    window.localStorage.setItem(STORAGE_KEY, proximoCache);
  }
}

function salvarCacheLocalPendente(database: LocalDatabase) {
  salvarCacheLocal(database);
  marcarCacheLocalPendente(true);
}

export async function carregarLocalDatabase() {
  if (typeof window === "undefined") {
    return databaseInicial;
  }

  const databaseEmCache = lerCacheLocal();
  const usarCacheLocal = cacheLocalTemAlteracaoPendente();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Local database API unavailable.");
    }

    const databaseRemoto = normalizarDatabase(
      (await response.json()) as Partial<LocalDatabase>,
    );
    const database = usarCacheLocal ? databaseEmCache : databaseRemoto;

    salvarCacheLocal(database);

    return database;
  } catch {
    return databaseEmCache;
  }
}

export async function salvarLocalDatabase(database: LocalDatabase) {
  salvarCacheLocalPendente(database);

  try {
    const response = await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(database),
    });

    if (!response.ok) {
      throw new Error("Local database API unavailable.");
    }

    marcarCacheLocalPendente(false);
  } catch {
    // In production/static previews the browser cannot write repository files.
  }

  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function observarLocalDatabase(callback: () => void) {
  window.addEventListener(STORAGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORAGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function criarIdLocal() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function criarLocalProfile(params: {
  first_name: string;
  last_name: string;
  academic_affiliation: string;
  presence_status: string;
  email?: string;
  phone?: string;
}) {
  const timestamp = agora();

  return {
    id: criarIdLocal(),
    full_name: `${params.first_name} ${params.last_name}`,
    first_name: params.first_name,
    last_name: params.last_name,
    academic_affiliation: params.academic_affiliation,
    presence_status: params.presence_status,
    email: params.email ?? "",
    phone: params.phone ?? "",
    skills: [],
    role: "researcher",
    is_active: true,
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies LocalProfile;
}

export function criarLocalAvailabilitySlot(params: {
  profile_id: string;
  weekday: number;
  periodo: PeriodoId;
}) {
  const timestamp = agora();
  const horario = horariosPorPeriodo[params.periodo];

  if (
    !horario ||
    !params.profile_id ||
    !Number.isInteger(params.weekday) ||
    params.weekday < 0 ||
    params.weekday > 6
  ) {
    throw new Error("Invalid availability slot.");
  }

  return {
    id: criarIdLocal(),
    profile_id: params.profile_id,
    weekday: params.weekday,
    periodo: params.periodo,
    starts_at: horario.starts_at,
    ends_at: horario.ends_at,
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies LocalAvailabilitySlot;
}

export function criarLocalPrinter(params: {
  name: string;
  model: string;
  brand: string;
  dimensions: string;
  allowed_filaments: string[];
}) {
  const timestamp = agora();
  const allowedFilaments = asStringArray(params.allowed_filaments);

  return {
    id: criarIdLocal(),
    name: params.name,
    model: params.model,
    brand: params.brand,
    dimensions: params.dimensions,
    allowed_filaments: allowedFilaments,
    status: "Ativa",
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies LocalPrinter;
}

export function criarLocalPrintReservation(params: {
  printer_id: string;
  profile_id: string;
  print_name: string;
  material: string;
  estimated_time: string;
  duration_minutes?: number;
  reservation_date?: string;
  starts_at?: string;
  scheduled_start_at?: string;
  scheduled_end_at?: string;
}) {
  const timestamp = agora();

  if (!params.printer_id || !params.profile_id) {
    throw new Error("Printer and profile are required.");
  }

  return {
    id: criarIdLocal(),
    printer_id: params.printer_id,
    profile_id: params.profile_id,
    print_name: params.print_name,
    material: params.material,
    estimated_time: params.estimated_time,
    duration_minutes: params.duration_minutes,
    reservation_date: params.reservation_date,
    starts_at: params.starts_at,
    scheduled_start_at: params.scheduled_start_at,
    scheduled_end_at: params.scheduled_end_at,
    status: "Aprovada",
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies LocalPrintReservation;
}
