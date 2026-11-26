import { describe, expect, it } from "vitest";

import {
  describeNotification,
  filterByBellPreference,
  getNotificationGroup,
  getNotificationHintKey,
  getNotificationTypesOfGroup,
  getVisibleNotificationGroups,
  type NotificationType,
} from "./notifications";

describe("pendências da campainha", () => {
  const pending = [
    { topic: "requests" as const, total: 1 },
    { topic: "purchases" as const, total: 3 },
    { topic: "tasks" as const, total: 2 },
  ];

  it("sem escolha salva, tudo aparece", () => {
    expect(filterByBellPreference(pending, [])).toEqual(pending);
  });

  it("assunto desligado no sino sai da lista e da contagem", () => {
    const visible = filterByBellPreference(pending, [
      { topic: "requests", in_app: false },
      { topic: "purchases", in_app: true },
    ]);
    expect(visible.map((item) => item.topic)).toEqual(["purchases", "tasks"]);
  });
});

describe("tipo desconhecido", () => {
  it("mostra um texto genérico em vez de falhar", () => {
    expect(describeNotification({ type: "tipo_novo" as NotificationType, params: { task: "x" } })).toEqual({
      title: "Nova notificação",
      detail: null,
      reason: null,
    });
  });
});

describe("avisos de tarefa", () => {
  it("descreve cada mudança de situação", () => {
    expect(describeNotification({ type: "task_status", params: { task: "Calibrar", project: "Lab 3D", status: "review" } })).toEqual({
      title: "Tarefa em revisão",
      detail: "Calibrar · Lab 3D",
      reason: null,
    });
    expect(describeNotification({ type: "task_status", params: { status: "done" } }).title).toBe("Tarefa concluída");
    expect(describeNotification({ type: "task_status", params: {} }).title).toBe("Tarefa atualizada");
  });

  it("ficam no assunto Tarefas, separado de Projetos", () => {
    expect(getNotificationTypesOfGroup("tasks").sort()).toEqual(["task_assigned", "task_status", "task_timer_reminder"]);
    expect(getNotificationTypesOfGroup("projects").sort()).toEqual(["project_join_decision", "project_join_request"]);
    expect(getNotificationHintKey("tasks", { role: "researcher" })).toBe("notifPrefs.tasksHint");
  });
});

describe("preferências por perfil", () => {
  const researcher = { role: "researcher" as const, is_maintainer: false };
  const maintainer = { role: "researcher" as const, is_maintainer: true };
  const coordinator = { role: "coordinator" as const, is_maintainer: false };
  const both = { role: "coordinator" as const, is_maintainer: true };

  it("mostra Sugestões só para coordenadores", () => {
    expect(getVisibleNotificationGroups(researcher)).not.toContain("feedback");
    expect(getVisibleNotificationGroups(maintainer)).not.toContain("feedback");
    expect(getVisibleNotificationGroups(coordinator)).toContain("feedback");
    expect(getVisibleNotificationGroups(both)).toContain("feedback");
  });

  it("explica os chamados conforme o que cada perfil recebe", () => {
    expect([researcher, maintainer, coordinator, both].map((profile) => getNotificationHintKey("requests", profile))).toEqual([
      "notifPrefs.requestsHint",
      "notifPrefs.requestsHintMaintainer",
      "notifPrefs.requestsHintCoordinator",
      "notifPrefs.requestsHintMaintainer",
    ]);
  });

  it("os demais assuntos mudam de texto só para coordenadores", () => {
    for (const group of ["bookings", "purchases", "projects"] as const) {
      expect(getNotificationHintKey(group, maintainer)).toBe(`notifPrefs.${group}Hint`);
      expect(getNotificationHintKey(group, coordinator)).toBe(`notifPrefs.${group}HintCoordinator`);
    }
  });
});

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

describe("notificação de tarefa atribuída", () => {
  it("diz quem atribuiu e mostra a tarefa e o projeto", () => {
    expect(describeNotification({ type: "task_assigned", params: { task: "Calibrar a mesa", project: "Lab 3D", by: "Ana" } })).toEqual({
      title: "Ana atribuiu uma tarefa a você",
      detail: "Calibrar a mesa · Lab 3D",
      reason: null,
    });
    expect(describeNotification({ type: "task_assigned", params: { task: "Calibrar a mesa" } }).title).toBe("Uma tarefa foi atribuída a você");
    expect(getNotificationGroup("task_assigned")).toBe("tasks");
  });

  it("lembra do timer ligado há horas, com a tarefa e o projeto", () => {
    expect(describeNotification({ type: "task_timer_reminder", params: { task: "Ensaio de tração", project: "Lab 3D", hours: 4 } })).toEqual({
      title: "Seu timer está ligado há 4 h — ainda está trabalhando?",
      detail: "Ensaio de tração · Lab 3D",
      reason: null,
    });
    expect(getNotificationGroup("task_timer_reminder")).toBe("tasks");
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
