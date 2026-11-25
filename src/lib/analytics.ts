import type { BookingStatus, EquipmentBooking } from "./domain";

export type PeriodKey = "7d" | "30d" | "90d" | "year";

export const periodOptions: PeriodKey[] = ["7d", "30d", "90d", "year"];

const DAY_MS = 24 * 60 * 60 * 1000;

// Intervalo [from, to) do período, terminando agora. "year" são os últimos 12 meses.
export function getPeriodRange(period: PeriodKey, now: Date) {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  return { from: new Date(now.getTime() - days * DAY_MS), to: now };
}

// Reservas que de fato ocupam ou ocuparam o equipamento (as pendentes, recusadas e canceladas ficam de fora).
const USAGE_STATUSES: BookingStatus[] = ["approved", "in_progress", "completed"];

export function countsAsUsage(booking: Pick<EquipmentBooking, "status">) {
  return USAGE_STATUSES.includes(booking.status);
}

export function bookingHours(booking: Pick<EquipmentBooking, "starts_at" | "ends_at">) {
  const ms = new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime();
  return Math.max(0, ms) / (60 * 60 * 1000);
}

// Reservas de uso que começam dentro do período.
export function filterUsageInPeriod(bookings: EquipmentBooking[], range: { from: Date; to: Date }) {
  return bookings.filter((booking) => {
    const start = new Date(booking.starts_at);
    return countsAsUsage(booking) && start >= range.from && start < range.to;
  });
}

export type UsageRow = { name: string; hours: number; count: number };

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function groupUsage(bookings: EquipmentBooking[], nameOf: (booking: EquipmentBooking) => string): UsageRow[] {
  const map = new Map<string, UsageRow>();
  for (const booking of bookings) {
    const name = nameOf(booking);
    const row = map.get(name) ?? { name, hours: 0, count: 0 };
    row.hours += bookingHours(booking);
    row.count += 1;
    map.set(name, row);
  }
  return [...map.values()].map((row) => ({ ...row, hours: round1(row.hours) })).sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
}

export function usageByEquipment(bookings: EquipmentBooking[], fallback: string) {
  return groupUsage(bookings, (booking) => booking.equipment?.name ?? fallback);
}

export function usageByProject(bookings: EquipmentBooking[], fallback: string) {
  return groupUsage(bookings, (booking) => booking.project_name || fallback);
}

export function usageByPerson(bookings: EquipmentBooking[], fallback: string) {
  return groupUsage(bookings, (booking) => booking.profile?.full_name ?? fallback);
}

export type TimeRow = { key: string; label: string; hours: number; count: number };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

// Início da semana (segunda-feira) em data local, "AAAA-MM-DD".
function weekStartKey(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

export type Granularity = "day" | "week" | "month";

export function getGranularity(period: PeriodKey): Granularity {
  return period === "year" ? "month" : period === "90d" ? "week" : "day";
}

export function bucketKey(date: Date, granularity: Granularity) {
  if (granularity === "month") return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  if (granularity === "week") return weekStartKey(date);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Série no tempo com todos os baldes do período (inclusive os vazios), do mais antigo ao mais novo.
export function usageOverTime(bookings: EquipmentBooking[], range: { from: Date; to: Date }, granularity: Granularity): TimeRow[] {
  const rows = new Map<string, TimeRow>();
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
  while (cursor <= range.to) {
    const key = bucketKey(cursor, granularity);
    if (!rows.has(key)) rows.set(key, { key, label: key, hours: 0, count: 0 });
    if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1, 1);
    else cursor.setDate(cursor.getDate() + (granularity === "week" ? 7 : 1));
  }
  // O último passo do cursor pode pular o balde em que o período termina.
  const lastKey = bucketKey(range.to, granularity);
  if (!rows.has(lastKey)) rows.set(lastKey, { key: lastKey, label: lastKey, hours: 0, count: 0 });
  for (const booking of bookings) {
    const row = rows.get(bucketKey(new Date(booking.starts_at), granularity));
    if (!row) continue;
    row.hours += bookingHours(booking);
    row.count += 1;
  }
  return [...rows.values()].map((row) => ({ ...row, hours: round1(row.hours) })).sort((a, b) => (a.key < b.key ? -1 : 1));
}

// Reservas por dia da semana (0 = domingo).
export function usageByWeekday(bookings: EquipmentBooking[]) {
  const rows = Array.from({ length: 7 }, (_, weekday) => ({ weekday, hours: 0, count: 0 }));
  for (const booking of bookings) {
    const row = rows[new Date(booking.starts_at).getDay()];
    row.hours += bookingHours(booking);
    row.count += 1;
  }
  return rows.map((row) => ({ ...row, hours: round1(row.hours) }));
}

// Contagem por situação, de todas as reservas que começam no período (não só as de uso).
export function bookingsByStatus(bookings: EquipmentBooking[], range: { from: Date; to: Date }) {
  const counts = new Map<BookingStatus, number>();
  for (const booking of bookings) {
    const start = new Date(booking.starts_at);
    if (start < range.from || start >= range.to) continue;
    counts.set(booking.status, (counts.get(booking.status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export function sumHours(bookings: EquipmentBooking[]) {
  return round1(bookings.reduce((total, booking) => total + bookingHours(booking), 0));
}
