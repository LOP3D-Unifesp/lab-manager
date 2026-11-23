export type MaintenanceEpisode = {
  id: string;
  equipment_id: string;
  reason: string;
  notes: string | null;
  expected_return_on: string | null;
  started_at: string;
  started_by_name: string | null;
  ended_at: string | null;
  ended_by_name: string | null;
  resolution_notes: string | null;
};

// Episódio ainda aberto (o equipamento segue em manutenção), se houver.
export function getOpenEpisode(episodes: MaintenanceEpisode[], equipmentId: string) {
  return episodes.find((episode) => episode.equipment_id === equipmentId && episode.ended_at === null) ?? null;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// "menos de 1 hora", "5 horas", "1 dia", "3 dias". Episódio aberto conta até `now`.
export function formatMaintenanceDuration(startedAt: string, endedAt: string | null, now: Date) {
  return formatDurationMs(new Date(endedAt ?? now).getTime() - new Date(startedAt).getTime());
}

export function formatDurationMs(ms: number) {
  if (ms < HOUR_MS) return "menos de 1 hora";
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }
  const days = Math.floor(ms / DAY_MS);
  return days === 1 ? "1 dia" : `${days} dias`;
}

// Resumo do histórico de um equipamento: quantas vezes parou e quanto durou, em média, cada parada concluída.
export function summarizeMaintenance(episodes: MaintenanceEpisode[]) {
  const closed = episodes
    .filter((episode) => episode.ended_at !== null)
    .map((episode) => new Date(episode.ended_at as string).getTime() - new Date(episode.started_at).getTime());
  return {
    count: episodes.length,
    averageMs: closed.length > 0 ? closed.reduce((sum, value) => sum + value, 0) / closed.length : null,
    longestMs: closed.length > 0 ? Math.max(...closed) : null,
  };
}

export type BookingSlot = {
  id: string;
  project_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  person: string | null;
};

// Reservas afetadas ao pôr o equipamento em manutenção. As pendentes ou aprovadas que ainda não
// começaram podem ser canceladas pelo app; as que já estão rolando precisam ser tratadas à mão.
export function splitAffectedBookings(bookings: BookingSlot[], now: Date) {
  const cancellable: BookingSlot[] = [];
  const running: BookingSlot[] = [];
  for (const booking of bookings) {
    if (new Date(booking.ends_at).getTime() <= now.getTime()) continue;
    const notStarted = new Date(booking.starts_at).getTime() > now.getTime();
    if (booking.status === "in_progress" || !notStarted) running.push(booking);
    else if (booking.status === "pending" || booking.status === "approved") cancellable.push(booking);
  }
  return { cancellable, running };
}

export function getMaintenanceErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("maintenance_already_open")) return "Este equipamento já está em manutenção.";
  if (text.includes("not_in_maintenance")) return "Este equipamento não está em manutenção.";
  if (text.includes("reason_required")) return "Informe o motivo da manutenção.";
  if (text.includes("coordinator_required")) return "Apenas coordenadores podem fazer essa alteração.";
  if (text.includes("equipment_not_found")) return "Equipamento não encontrado.";
  return text || "Não foi possível concluir a operação.";
}

export function formatMaintenanceDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Data (AAAA-MM-DD) como dd/mm/aaaa, sem passar por fuso.
export function formatMaintenanceDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
