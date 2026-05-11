export type PeriodoId = "manha" | "tarde" | "noite";

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
  role: "researcher";
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
  status: "Ativa" | "Em manutencao";
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
  status: "Pendente" | "Em andamento" | "Concluida";
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

function criarDataLocal(data: string, horario: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);

  return new Date(ano, mes - 1, dia, hora, minuto);
}

function normalizarReserva(reserva: LocalPrintReservation) {
  if (
    reserva.scheduled_start_at ||
    reserva.scheduled_end_at ||
    !reserva.reservation_date ||
    !reserva.starts_at
  ) {
    return reserva;
  }

  const inicio = criarDataLocal(reserva.reservation_date, reserva.starts_at);
  const minutos =
    reserva.duration_minutes ??
    Number.parseFloat(reserva.estimated_time.replace(",", ".")) * 60;

  if (
    !Number.isFinite(inicio.getTime()) ||
    !Number.isFinite(minutos) ||
    minutos <= 0
  ) {
    return reserva;
  }

  return {
    ...reserva,
    duration_minutes: reserva.duration_minutes ?? minutos,
    scheduled_start_at: inicio.toISOString(),
    scheduled_end_at: new Date(
      inicio.getTime() + minutos * 60 * 1000,
    ).toISOString(),
  } satisfies LocalPrintReservation;
}

function normalizarDatabase(database: Partial<LocalDatabase>): LocalDatabase {
  return {
    schema_version: 1,
    profiles: Array.isArray(database.profiles)
      ? database.profiles.map((profile) => ({
          ...profile,
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          skills: Array.isArray(profile.skills) ? profile.skills : [],
        }))
      : [],
    availability_slots: Array.isArray(database.availability_slots)
      ? database.availability_slots
      : [],
    printers: Array.isArray(database.printers) ? database.printers : [],
    print_reservations: Array.isArray(database.print_reservations)
      ? database.print_reservations.map(normalizarReserva)
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

  return {
    id: criarIdLocal(),
    name: params.name,
    model: params.model,
    brand: params.brand,
    dimensions: params.dimensions,
    allowed_filaments: params.allowed_filaments,
    status: "Ativa",
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies LocalPrinter;
}

export function criarLocalPrintReservation(params: {
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
}) {
  const timestamp = agora();

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
    status: "Pendente",
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies LocalPrintReservation;
}
