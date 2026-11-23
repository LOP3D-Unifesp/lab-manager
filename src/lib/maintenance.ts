export type BlockState = "active" | "upcoming" | "past";

type Interval = { starts_at: string; ends_at: string };

export function getBlockState(block: Interval, now: Date): BlockState {
  if (new Date(block.ends_at).getTime() <= now.getTime()) return "past";
  if (new Date(block.starts_at).getTime() <= now.getTime()) return "active";
  return "upcoming";
}

// Bloqueios que ainda interessam: em curso ou futuros, do mais próximo ao mais distante.
export function getRelevantBlocks<T extends Interval>(blocks: T[], now: Date) {
  return blocks
    .filter((block) => getBlockState(block, now) !== "past")
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

export type BookingSlot = {
  id: string;
  project_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  person: string | null;
};

const BLOCKING_STATUSES = ["pending", "approved", "in_progress"];

// Reservas que ocupam o horário e se sobrepõem ao intervalo (como na RPC: início < fim da outra e fim > início).
export function findBookingConflicts(bookings: BookingSlot[], start: Date, end: Date) {
  return bookings.filter(
    (booking) =>
      BLOCKING_STATUSES.includes(booking.status) &&
      start.getTime() < new Date(booking.ends_at).getTime() &&
      end.getTime() > new Date(booking.starts_at).getTime(),
  );
}

// Devolve a mensagem de erro, ou null se o intervalo é válido.
export function validateMaintenanceInterval(start: Date | null, end: Date | null, now: Date) {
  if (!start || !end) return "Informe a data e a hora de início e de fim.";
  if (end.getTime() <= start.getTime()) return "O fim precisa ser depois do início.";
  if (start.getTime() < now.getTime()) return "O início precisa ser no futuro.";
  return null;
}
