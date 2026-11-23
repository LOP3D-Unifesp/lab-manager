import { describe, expect, it } from "vitest";

import {
  countOpenRequests,
  filterRequests,
  getMyRequestGroups,
  getRequestActions,
  getRequestErrorMessage,
  isRequestActive,
  orderRequests,
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

describe("ordenar a lista de chamados", () => {
  const list = [
    request({ id: "a", equipment_name: "Impressora B", status: "open", urgency: "low", created_at: "2026-06-03T10:00:00Z" }),
    request({ id: "b", equipment_name: "Computador", status: "in_progress", urgency: "urgent", created_at: "2026-06-01T10:00:00Z" }),
    request({ id: "c", equipment_name: "Impressora A", status: "open", urgency: "urgent", created_at: "2026-06-02T10:00:00Z" }),
    request({ id: "d", equipment_name: "Impressora A", status: "resolved", urgency: "normal", created_at: "2026-06-04T10:00:00Z" }),
  ];
  const ids = (items: MaintenanceRequest[]) => items.map((item) => item.id);

  it("prioridade mantém a ordem de sempre", () => {
    expect(ids(orderRequests(list, "priority"))).toEqual(["c", "a", "b", "d"]);
  });

  it("ordena por data, do mais novo ou do mais antigo", () => {
    expect(ids(orderRequests(list, "newest"))).toEqual(["d", "a", "c", "b"]);
    expect(ids(orderRequests(list, "oldest"))).toEqual(["b", "c", "a", "d"]);
  });

  it("ordena por equipamento em ordem alfabética, com o mais novo primeiro dentro do mesmo equipamento", () => {
    expect(ids(orderRequests(list, "equipment"))).toEqual(["b", "d", "c", "a"]);
  });

  it("ordena por situação: abertos, em andamento, resolvidos", () => {
    expect(ids(orderRequests(list, "status"))).toEqual(["c", "a", "b", "d"]);
  });

  it("não altera a lista original", () => {
    const copy = [...list];
    orderRequests(list, "newest");
    expect(list).toEqual(copy);
  });
});

describe("chamados no Dashboard", () => {
  const requests = [
    request({ id: "a", status: "open", requested_by: "ana", created_at: "2026-06-01T10:00:00Z" }),
    request({ id: "b", status: "in_progress", requested_by: "carla", assigned_to: "bia" }),
    request({ id: "c", status: "in_progress", requested_by: "carla", assigned_to: "dani" }),
    request({ id: "d", status: "open", requested_by: "bia", urgency: "urgent" }),
    request({ id: "e", status: "resolved", requested_by: "bia" }),
  ];
  const ids = (list: MaintenanceRequest[]) => list.map((r) => r.id);

  it("responsável vê os abertos e os que assumiu, sem repetir os que ele mesmo abriu", () => {
    const groups = getMyRequestGroups(requests, "bia", true);
    expect(ids(groups.toHandle)).toEqual(["d", "a", "b"]);
    expect(ids(groups.mine)).toEqual([]);
  });

  it("quem só abre chamados vê apenas os seus que seguem ativos", () => {
    const groups = getMyRequestGroups(requests, "ana", false);
    expect(ids(groups.toHandle)).toEqual([]);
    expect(ids(groups.mine)).toEqual(["a"]);
    expect(ids(getMyRequestGroups(requests, "carla", false).mine)).toEqual(["b", "c"]);
  });

  it("chamados encerrados não aparecem", () => {
    expect(ids(getMyRequestGroups(requests, "bia", false).mine)).toEqual(["d"]);
  });
});

describe("ações permitidas", () => {
  it("responsáveis tratam o chamado em qualquer etapa ativa", () => {
    expect(getRequestActions(request({ status: "open" }), "bia", true)).toMatchObject({ take: true, resolve: true, giveBack: false, cancel: true, reopen: false, waitPart: false, resume: false });
    expect(getRequestActions(request({ status: "in_progress" }), "bia", true)).toMatchObject({ take: false, resolve: true, giveBack: true, cancel: true, reopen: false, waitPart: true, resume: false });
    expect(getRequestActions(request({ status: "resolved" }), "bia", true).reopen).toBe(true);
  });

  it("quem abriu só cancela enquanto está aberto; os outros não fazem nada", () => {
    expect(getRequestActions(request({ status: "open" }), "ana", false).cancel).toBe(true);
    expect(getRequestActions(request({ status: "in_progress" }), "ana", false).cancel).toBe(false);
    expect(getRequestActions(request({ status: "open" }), "carla", false)).toEqual({ take: false, resolve: false, giveBack: false, cancel: false, reopen: false, waitPart: false, resume: false });
  });

  it("chamado cancelado é definitivo", () => {
    expect(getRequestActions(request({ status: "cancelled" }), "bia", true)).toEqual({ take: false, resolve: false, giveBack: false, cancel: false, reopen: false, waitPart: false, resume: false });
  });
});

describe("aguardando peça", () => {
  it("conta como chamado ativo e aparece depois dos em andamento", () => {
    expect(isRequestActive("waiting_part")).toBe(true);
    const sorted = sortRequests([
      request({ id: "w", status: "waiting_part", created_at: "2026-06-01T10:00:00Z" }),
      request({ id: "i", status: "in_progress", created_at: "2026-06-03T10:00:00Z" }),
      request({ id: "o", status: "open", created_at: "2026-06-05T10:00:00Z" }),
      request({ id: "r", status: "resolved", created_at: "2026-06-06T10:00:00Z" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["o", "i", "w", "r"]);
  });

  it("o responsável pode marcar que aguarda peça e depois retomar", () => {
    expect(getRequestActions(request({ status: "in_progress" }), "bia", true)).toMatchObject({ waitPart: true, resume: false });
    expect(getRequestActions(request({ status: "waiting_part" }), "bia", true)).toMatchObject({
      take: false,
      resolve: true,
      giveBack: true,
      cancel: true,
      waitPart: false,
      resume: true,
    });
    expect(getRequestActions(request({ status: "waiting_part" }), "ana", false)).toMatchObject({ cancel: false, resume: false });
  });

  it("no Dashboard, o que aguarda peça sem responsável continua aparecendo para quem atende", () => {
    const list = [
      request({ id: "w1", status: "waiting_part", assigned_to: "bia" }),
      request({ id: "w2", status: "waiting_part", assigned_to: "dani" }),
      request({ id: "w3", status: "waiting_part", assigned_to: null }),
    ];
    expect(getMyRequestGroups(list, "bia", true).toHandle.map((item) => item.id).sort()).toEqual(["w1", "w3"]);
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
