import { describe, expect, it } from "vitest";

import { describeNotification, getNotificationGroup, getNotificationTypesOfGroup } from "./notifications";

describe("describeNotification", () => {
  it("monta o texto da reserva com projeto e equipamento", () => {
    expect(describeNotification({ type: "booking_approved", params: { project: "TCC", equipment: "Bambu" } })).toEqual({
      title: "Reserva aprovada",
      detail: "TCC · Bambu",
      reason: null,
    });
  });

  it("inclui o motivo da recusa", () => {
    expect(describeNotification({ type: "booking_rejected", params: { project: "TCC", equipment: "Bambu", reason: "manutenção" } }).reason).toBe("manutenção");
  });

  it("destaca chamado e compra urgentes", () => {
    expect(describeNotification({ type: "request_new", params: { equipment: "Bambu", urgency: "urgent" } }).title).toBe("Chamado urgente");
    expect(describeNotification({ type: "request_new", params: { equipment: "Bambu", urgency: "normal" } }).title).toBe("Novo chamado de manutenção");
    expect(describeNotification({ type: "purchase_new", params: { item: "Bico", urgency: "urgent" } }).detail).toBe("Bico");
  });

  it("usa o texto do status da compra e cai num texto genérico se faltar dado", () => {
    expect(describeNotification({ type: "purchase_status", params: { item: "Bico", status: "delivered" } }).title).toBe("Pedido entregue");
    expect(describeNotification({ type: "purchase_status", params: {} }).title).toBe("Pedido de compra atualizado");
  });
});

describe("grupos de notificação", () => {
  it("agrupa cada tipo no assunto certo", () => {
    expect(getNotificationGroup("booking_pending")).toBe("bookings");
    expect(getNotificationGroup("request_resolved")).toBe("requests");
    expect(getNotificationGroup("purchase_status")).toBe("purchases");
    expect(getNotificationGroup("feedback_new")).toBe("feedback");
    expect(getNotificationTypesOfGroup("requests")).toEqual(["request_new", "request_resolved"]);
  });
});
