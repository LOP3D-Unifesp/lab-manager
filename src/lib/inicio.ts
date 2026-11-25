import { reservaBloqueiaHorario, type EquipmentBooking } from "./domain";
import { isPurchaseOpen, type PurchaseRequest } from "./purchases";

export type DayPart = "morning" | "afternoon" | "evening";

// Saudação da Inicial: bom dia até 11h59, boa tarde até 17h59 e boa noite depois.
export function getDayPart(hour: number): DayPart {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// Primeiro nome para a saudação ("Ana Souza" vira "Ana").
export function getFirstName(fullName: string | null | undefined) {
  return (fullName ?? "").trim().split(/\s+/)[0] ?? "";
}

// Reservas da pessoa que ainda não terminaram (inclui a que está em andamento), da mais próxima para a mais distante.
export function getMyUpcomingBookings(bookings: EquipmentBooking[], profileId: string, now: Date, limit = 5) {
  return bookings
    .filter((booking) => booking.profile_id === profileId && reservaBloqueiaHorario(booking) && new Date(booking.ends_at) > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, limit);
}

export function isBookingHappeningNow(booking: Pick<EquipmentBooking, "starts_at" | "ends_at">, now: Date) {
  return new Date(booking.starts_at) <= now && now < new Date(booking.ends_at);
}

// Pedidos de compra da pessoa ainda em andamento (pedido, aprovado ou comprado), os mais novos primeiro.
export function getMyOpenPurchases(purchases: PurchaseRequest[], profileId: string, limit = 5) {
  return purchases
    .filter((purchase) => purchase.requested_by === profileId && isPurchaseOpen(purchase.status))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export type DecisionKey = "bookings" | "purchases" | "requests" | "feedback" | "joinRequests";

export type DecisionItem = { key: DecisionKey; count: number; urgent: number; to: string };

type DecisionInput = {
  isCoordinator: boolean;
  canMaintain: boolean;
  pendingBookings: number;
  purchases: number;
  urgentPurchases: number;
  maintenanceRequests: number;
  urgentRequests: number;
  feedback: number;
  joinRequests: number;
};

// O que espera uma decisão da pessoa. Coordenador vê tudo; quem só cuida da manutenção vê os chamados;
// os pedidos de entrada valem para quem é membro de projeto (a contagem já vem filtrada pelo banco).
export function getDecisionItems(input: DecisionInput): DecisionItem[] {
  const items: DecisionItem[] = [];
  if (input.isCoordinator) {
    items.push({ key: "bookings", count: input.pendingBookings, urgent: 0, to: "/reservas" });
    items.push({ key: "purchases", count: input.purchases, urgent: input.urgentPurchases, to: "/compras" });
  }
  if (input.canMaintain) {
    items.push({ key: "requests", count: input.maintenanceRequests, urgent: input.urgentRequests, to: "/equipamentos?vista=chamados" });
  }
  items.push({ key: "joinRequests", count: input.joinRequests, urgent: 0, to: "/projetos" });
  if (input.isCoordinator) {
    items.push({ key: "feedback", count: input.feedback, urgent: 0, to: "/feedback" });
  }
  return items.filter((item) => item.count > 0);
}
