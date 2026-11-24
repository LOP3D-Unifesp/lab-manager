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

  it("descreve cada mudança de status de chamado e de pedido", () => {
    expect(describeNotification({ type: "request_status", params: { equipment: "Bambu", status: "in_progress" } })).toEqual({
      title: "Chamado em andamento",
      detail: "Bambu",
      reason: null,
    });
    expect(describeNotification({ type: "request_status", params: { status: "waiting_part" } }).title).toBe("Chamado aguardando peça");
    expect(describeNotification({ type: "request_status", params: {} }).title).toBe("Chamado atualizado");
    expect(describeNotification({ type: "purchase_status", params: { item: "Bico", status: "cancelled" } }).title).toBe("Pedido cancelado");
  });

  it("usa o texto do status da compra e cai num texto genérico se faltar dado", () => {
    expect(describeNotification({ type: "purchase_status", params: { item: "Bico", status: "delivered" } }).title).toBe("Pedido entregue");
    expect(describeNotification({ type: "purchase_status", params: {} }).title).toBe("Pedido de compra atualizado");
  });
});

describe("notificações de projeto", () => {
  it("descreve o pedido de entrada e a decisão", () => {
    expect(describeNotification({ type: "project_join_request", params: { requester: "Ana", project: "Lab 3D" } })).toEqual({
      title: "Pedido para entrar em projeto",
      detail: "Ana · Lab 3D",
      reason: null,
    });
    expect(describeNotification({ type: "project_join_decision", params: { project: "Lab 3D", approved: true } }).title).toBe("Você entrou no projeto");
    expect(describeNotification({ type: "project_join_decision", params: { project: "Lab 3D", approved: false } }).title).toBe("Pedido de entrada recusado");
    expect(getNotificationGroup("project_join_request")).toBe("projects");
  });
});

describe("grupos de notificação", () => {
  it("agrupa cada tipo no assunto certo", () => {
    expect(getNotificationGroup("booking_pending")).toBe("bookings");
    expect(getNotificationGroup("request_resolved")).toBe("requests");
    expect(getNotificationGroup("purchase_status")).toBe("purchases");
    expect(getNotificationGroup("feedback_new")).toBe("feedback");
    expect(getNotificationTypesOfGroup("requests")).toEqual(["request_new", "request_resolved", "request_status"]);
  });
});
