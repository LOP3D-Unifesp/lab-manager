import { describe, expect, it } from "vitest";

import {
  countOpenRequests,
  filterRequests,
  getRequestActions,
  getRequestErrorMessage,
  isRequestActive,
  sortRequests,
  validateRequestDescription,
  type MaintenanceRequest,
  type RequestFilters,
} from "./maintenanceRequests";
import { canMaintain } from "./domain";

function request(overrides: Partial<MaintenanceRequest>): MaintenanceRequest {
  return {
    id: "r",
    equipment_id: "eq1",
    equipment_name: "Impressora A",
    equipment_type_id: "tipoA",
    description: "Bico entupido",
    urgency: "normal",
    status: "open",
    requested_by: "ana",
    requested_by_name: "Ana",
    assigned_to: null,
    assigned_to_name: null,
    resolution_notes: null,
    resolved_at: null,
    photo_paths: [],
    created_at: "2026-06-10T10:00:00Z",
    ...overrides,
  };
}

describe("quem faz manutenção", () => {
  it("o coordenador e o responsável marcado podem tratar chamados", () => {
    expect(canMaintain({ role: "coordinator" })).toBe(true);
    expect(canMaintain({ role: "researcher", is_maintainer: true })).toBe(true);
    expect(canMaintain({ role: "researcher", is_maintainer: false })).toBe(false);
    expect(canMaintain({ role: "researcher" })).toBe(false);
    expect(canMaintain(null)).toBe(false);
  });
});

describe("chamados", () => {
  const requests = [
    request({ id: "a", status: "open", urgency: "low", created_at: "2026-06-01T10:00:00Z" }),
    request({ id: "b", status: "open", urgency: "urgent", created_at: "2026-06-05T10:00:00Z" }),
    request({ id: "c", status: "in_progress", assigned_to: "bia", created_at: "2026-06-02T10:00:00Z" }),
    request({ id: "d", status: "resolved", created_at: "2026-06-08T10:00:00Z" }),
    request({ id: "e", status: "cancelled", equipment_id: "eq2", equipment_type_id: "tipoB", created_at: "2026-06-09T10:00:00Z" }),
  ];
  const all: RequestFilters = { typeId: "all", equipmentId: "all", status: "all", mine: false };
  const ids = (list: MaintenanceRequest[]) => list.map((r) => r.id);

  it("considera ativos os abertos e os em andamento", () => {
    expect(isRequestActive("open")).toBe(true);
    expect(isRequestActive("in_progress")).toBe(true);
    expect(isRequestActive("resolved")).toBe(false);
    expect(isRequestActive("cancelled")).toBe(false);
  });

  it("filtra por equipamento, situação e 'meus'", () => {
    expect(ids(filterRequests(requests, { ...all, status: "active" }, "ana"))).toEqual(["a", "b", "c"]);
    expect(ids(filterRequests(requests, { ...all, equipmentId: "eq2" }, "ana"))).toEqual(["e"]);
    expect(ids(filterRequests(requests, { ...all, status: "resolved" }, "ana"))).toEqual(["d"]);
    expect(ids(filterRequests(requests, { ...all, typeId: "tipoB" }, "ana"))).toEqual(["e"]);
    expect(ids(filterRequests(requests, { ...all, typeId: "tipoA", status: "active" }, "ana"))).toEqual(["a", "b", "c"]);
    expect(ids(filterRequests(requests, { ...all, mine: true }, "bia"))).toEqual(["c"]);
  });

  it("ordena abertos primeiro, por urgência e idade, e os encerrados por último", () => {
    expect(ids(sortRequests(requests))).toEqual(["b", "a", "c", "e", "d"]);
  });

  it("conta só os chamados ativos de um equipamento", () => {
    expect(countOpenRequests(requests, "eq1")).toBe(3);
    expect(countOpenRequests(requests, "eq2")).toBe(0);
  });
});

describe("ações permitidas", () => {
  it("responsáveis tratam o chamado em qualquer etapa ativa", () => {
    expect(getRequestActions(request({ status: "open" }), "bia", true)).toEqual({ take: true, resolve: true, giveBack: false, cancel: true, reopen: false });
    expect(getRequestActions(request({ status: "in_progress" }), "bia", true)).toEqual({ take: false, resolve: true, giveBack: true, cancel: true, reopen: false });
    expect(getRequestActions(request({ status: "resolved" }), "bia", true).reopen).toBe(true);
  });

  it("quem abriu só cancela enquanto está aberto; os outros não fazem nada", () => {
    expect(getRequestActions(request({ status: "open" }), "ana", false).cancel).toBe(true);
    expect(getRequestActions(request({ status: "in_progress" }), "ana", false).cancel).toBe(false);
    expect(getRequestActions(request({ status: "open" }), "carla", false)).toEqual({ take: false, resolve: false, giveBack: false, cancel: false, reopen: false });
  });

  it("chamado cancelado é definitivo", () => {
    expect(getRequestActions(request({ status: "cancelled" }), "bia", true)).toEqual({ take: false, resolve: false, giveBack: false, cancel: false, reopen: false });
  });
});

describe("texto e erros", () => {
  it("exige entre 3 e 2000 caracteres", () => {
    expect(validateRequestDescription(" ab ")).not.toBeNull();
    expect(validateRequestDescription("abc")).toBeNull();
    expect(validateRequestDescription("a".repeat(2001))).not.toBeNull();
  });

  it("traduz erros conhecidos", () => {
    expect(getRequestErrorMessage(new Error("maintainer_required"))).toContain("responsáveis pela manutenção");
    expect(getRequestErrorMessage(new Error("invalid_assignee"))).toContain("responsável");
    expect(getRequestErrorMessage(new Error("outro"))).toBe("outro");
  });
});
