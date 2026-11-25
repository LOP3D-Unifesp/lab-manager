import { describe, expect, it } from "vitest";

import type { EquipmentBooking } from "./domain";
import { countEquipmentByStatus, getDayPart, getDecisionItems, getFirstName, getMyOpenPurchases, getMyUpcomingBookings, isBookingHappeningNow } from "./inicio";
import type { PurchaseRequest } from "./purchases";

function booking(id: string, profileId: string, start: string, end: string, status: EquipmentBooking["status"] = "approved") {
  return { id, profile_id: profileId, starts_at: start, ends_at: end, status } as EquipmentBooking;
}

function purchase(id: string, requestedBy: string, status: PurchaseRequest["status"], createdAt: string) {
  return { id, requested_by: requestedBy, status, created_at: createdAt } as PurchaseRequest;
}

describe("saudação", () => {
  it("separa manhã, tarde e noite", () => {
    expect(getDayPart(0)).toBe("morning");
    expect(getDayPart(11)).toBe("morning");
    expect(getDayPart(12)).toBe("afternoon");
    expect(getDayPart(17)).toBe("afternoon");
    expect(getDayPart(18)).toBe("evening");
  });

  it("usa só o primeiro nome", () => {
    expect(getFirstName("Ana Souza Lima")).toBe("Ana");
    expect(getFirstName("  Bia ")).toBe("Bia");
    expect(getFirstName(null)).toBe("");
  });
});

describe("minhas reservas", () => {
  const now = new Date("2026-11-25T12:00:00Z");

  it("traz só as da pessoa que não terminaram, da mais próxima para a mais distante", () => {
    const list = [
      booking("depois", "eu", "2026-11-27T10:00:00Z", "2026-11-27T12:00:00Z"),
      booking("agora", "eu", "2026-11-25T11:00:00Z", "2026-11-25T13:00:00Z", "in_progress"),
      booking("passada", "eu", "2026-11-24T10:00:00Z", "2026-11-24T12:00:00Z"),
      booking("de-outra", "outra", "2026-11-26T10:00:00Z", "2026-11-26T12:00:00Z"),
      booking("cancelada", "eu", "2026-11-26T10:00:00Z", "2026-11-26T12:00:00Z", "cancelled"),
    ];
    expect(getMyUpcomingBookings(list, "eu", now).map((item) => item.id)).toEqual(["agora", "depois"]);
  });

  it("respeita o limite", () => {
    const list = [1, 2, 3].map((day) => booking(`r${day}`, "eu", `2026-12-0${day}T10:00:00Z`, `2026-12-0${day}T11:00:00Z`));
    expect(getMyUpcomingBookings(list, "eu", now, 2)).toHaveLength(2);
  });

  it("sabe se a reserva está acontecendo agora", () => {
    expect(isBookingHappeningNow(booking("a", "eu", "2026-11-25T11:00:00Z", "2026-11-25T13:00:00Z"), now)).toBe(true);
    expect(isBookingHappeningNow(booking("b", "eu", "2026-11-25T12:00:00Z", "2026-11-25T13:00:00Z"), now)).toBe(true);
    expect(isBookingHappeningNow(booking("c", "eu", "2026-11-25T13:00:00Z", "2026-11-25T14:00:00Z"), now)).toBe(false);
  });
});

describe("meus pedidos de compra", () => {
  it("traz só os meus em andamento, os mais novos primeiro", () => {
    const list = [
      purchase("velho", "eu", "requested", "2026-11-01T00:00:00Z"),
      purchase("novo", "eu", "approved", "2026-11-20T00:00:00Z"),
      purchase("entregue", "eu", "delivered", "2026-11-22T00:00:00Z"),
      purchase("recusado", "eu", "rejected", "2026-11-23T00:00:00Z"),
      purchase("de-outra", "outra", "requested", "2026-11-24T00:00:00Z"),
    ];
    expect(getMyOpenPurchases(list, "eu").map((item) => item.id)).toEqual(["novo", "velho"]);
  });
});

describe("o que espera decisão", () => {
  const base = {
    isCoordinator: false,
    canMaintain: false,
    pendingBookings: 0,
    purchases: 0,
    urgentPurchases: 0,
    maintenanceRequests: 0,
    urgentRequests: 0,
    feedback: 0,
    joinRequests: 0,
  };

  it("coordenador vê reservas, compras, chamados, pedidos de entrada e sugestões, só os que têm algo", () => {
    const items = getDecisionItems({ ...base, isCoordinator: true, canMaintain: true, pendingBookings: 2, purchases: 1, urgentPurchases: 1, maintenanceRequests: 3, joinRequests: 1, feedback: 4 });
    expect(items.map((item) => item.key)).toEqual(["bookings", "purchases", "requests", "joinRequests", "feedback"]);
    expect(items.find((item) => item.key === "purchases")?.urgent).toBe(1);
  });

  it("some quando não há nada pendente", () => {
    expect(getDecisionItems({ ...base, isCoordinator: true, canMaintain: true })).toEqual([]);
  });

  it("quem só mantém equipamentos vê os chamados e os pedidos de entrada", () => {
    const items = getDecisionItems({ ...base, canMaintain: true, maintenanceRequests: 2, purchases: 5, feedback: 3, joinRequests: 1 });
    expect(items.map((item) => item.key)).toEqual(["requests", "joinRequests"]);
  });

  it("pesquisador sem permissões extras só vê pedidos de entrada", () => {
    const items = getDecisionItems({ ...base, purchases: 5, joinRequests: 2 });
    expect(items.map((item) => item.key)).toEqual(["joinRequests"]);
  });
});

describe("equipamentos por situação", () => {
  it("conta o total e cada situação", () => {
    const counts = countEquipmentByStatus([{ status: "active" }, { status: "active" }, { status: "maintenance" }, { status: "stopped" }, { status: "disabled" }, { status: "unavailable" }]);
    expect(counts).toEqual({ total: 6, active: 2, maintenance: 1, stopped: 1, other: 2 });
  });
});
