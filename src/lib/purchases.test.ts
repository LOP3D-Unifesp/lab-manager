import { describe, expect, it } from "vitest";

import {
  countUnseenPurchaseUpdates,
  describePurchaseUpdate,
  filterPurchases,
  getPurchaseActions,
  getPurchaseUndo,
  isNotifiablePurchaseStatus,
  isValidPurchaseUrl,
  parseMoney,
  sortPurchases,
  summarizeByProject,
  validatePurchaseForm,
  type PurchaseRequest,
} from "./purchases";

function purchase(overrides: Partial<PurchaseRequest>): PurchaseRequest {
  return {
    id: "p",
    project_id: "alfa",
    project_name: "Alfa",
    requested_by: "ana",
    requested_by_name: "Ana",
    item: "Bico 0.4",
    url: null,
    quantity: 1,
    estimated_amount: 100,
    funding_category: "custeio",
    notes: null,
    status: "requested",
    decided_by_name: null,
    decided_at: null,
    rejected_reason: null,
    actual_amount: null,
    purchased_at: null,
    delivered_at: null,
    created_at: "2026-06-10T10:00:00Z",
    ...overrides,
  };
}

describe("lista de pedidos", () => {
  const list = [
    purchase({ id: "a", status: "delivered", created_at: "2026-06-01T10:00:00Z" }),
    purchase({ id: "b", status: "requested", created_at: "2026-06-05T10:00:00Z" }),
    purchase({ id: "c", status: "requested", created_at: "2026-06-02T10:00:00Z", project_id: "beta", project_name: "Beta", requested_by: "bia" }),
    purchase({ id: "d", status: "approved" }),
    purchase({ id: "e", status: "rejected", created_at: "2026-06-09T10:00:00Z" }),
    purchase({ id: "f", status: "cancelled", created_at: "2026-06-08T10:00:00Z" }),
  ];
  const ids = (items: PurchaseRequest[]) => items.map((item) => item.id);
  const all = { status: "all" as const, projectId: "all", category: "all" as const, mine: false };

  it("ordena quem espera decisão primeiro (mais antigo antes) e os encerrados por último", () => {
    expect(ids(sortPurchases(list))).toEqual(["c", "b", "d", "a", "e", "f"]);
  });

  it("filtra por situação, projeto e 'meus pedidos'", () => {
    expect(ids(filterPurchases(list, { ...all, status: "open" }, "ana"))).toEqual(["b", "c", "d"]);
    expect(ids(filterPurchases(list, { ...all, projectId: "beta" }, "ana"))).toEqual(["c"]);
    expect(ids(filterPurchases(list, { ...all, mine: true, status: "open" }, "bia"))).toEqual(["c"]);
    expect(ids(filterPurchases(list, { ...all, status: "rejected" }, "ana"))).toEqual(["e"]);
    expect(ids(filterPurchases(list, { ...all, category: "capital" }, "ana"))).toEqual([]);
    expect(ids(filterPurchases(list, { ...all, category: "custeio", status: "open" }, "ana"))).toEqual(["b", "c", "d"]);
  });
});

describe("ações permitidas", () => {
  it("o coordenador aprova, recusa, compra e entrega conforme a etapa", () => {
    expect(getPurchaseActions(purchase({ status: "requested" }), "coord", true)).toEqual({ edit: true, cancel: true, approve: true, reject: true, purchase: false, deliver: false, undo: null });
    expect(getPurchaseActions(purchase({ status: "approved" }), "coord", true)).toMatchObject({ edit: false, cancel: true, approve: false, reject: false, purchase: true, deliver: false });
    expect(getPurchaseActions(purchase({ status: "purchased" }), "coord", true)).toMatchObject({ edit: false, cancel: false, approve: false, reject: false, purchase: false, deliver: true });
    expect(getPurchaseActions(purchase({ status: "delivered" }), "coord", true)).toMatchObject({ edit: false, cancel: false, approve: false, reject: false, purchase: false, deliver: false });
  });

  it("quem pediu só edita e cancela enquanto está solicitado", () => {
    expect(getPurchaseActions(purchase({ status: "requested" }), "ana", false)).toEqual({ edit: true, cancel: true, approve: false, reject: false, purchase: false, deliver: false, undo: null });
    expect(getPurchaseActions(purchase({ status: "approved" }), "ana", false).cancel).toBe(false);
    expect(getPurchaseActions(purchase({ status: "requested" }), "bia", false).edit).toBe(false);
  });
});

describe("voltar uma etapa", () => {
  it("o coordenador desfaz cada etapa, e o aviso só aparece quando algo é apagado", () => {
    expect(getPurchaseUndo("requested")).toBeNull();
    expect(getPurchaseUndo("approved")?.status).toBe("requested");
    expect(getPurchaseUndo("purchased")).toMatchObject({ status: "approved", label: "Desfazer compra" });
    expect(getPurchaseUndo("purchased")?.warning).toMatch(/valor pago/);
    expect(getPurchaseUndo("delivered")?.status).toBe("purchased");
    expect(getPurchaseUndo("rejected")?.status).toBe("requested");
    expect(getPurchaseUndo("cancelled")?.label).toBe("Reabrir pedido");
  });

  it("quem pediu não desfaz nada", () => {
    expect(getPurchaseActions(purchase({ status: "approved" }), "ana", false).undo).toBeNull();
    expect(getPurchaseActions(purchase({ status: "cancelled" }), "ana", false).undo).toBeNull();
  });
});

describe("avisos para quem pediu", () => {
  it("descreve cada etapa decidida pelo coordenador", () => {
    expect(describePurchaseUpdate({ item: "Bico", status: "approved", rejected_reason: null })).toEqual({ title: "Pedido aprovado", body: "“Bico” foi aprovado." });
    expect(describePurchaseUpdate({ item: "Bico", status: "rejected", rejected_reason: "sem verba" }).body).toBe("“Bico” foi recusado: sem verba");
    expect(describePurchaseUpdate({ item: "Bico", status: "rejected", rejected_reason: null }).body).toBe("“Bico” foi recusado.");
    expect(describePurchaseUpdate({ item: "Bico", status: "purchased", rejected_reason: null }).title).toBe("Pedido comprado");
    expect(describePurchaseUpdate({ item: "Bico", status: "delivered", rejected_reason: null }).body).toBe("“Bico” foi entregue.");
  });

  it("só avisa as etapas decididas, não pedidos solicitados ou cancelados", () => {
    expect(isNotifiablePurchaseStatus("approved")).toBe(true);
    expect(isNotifiablePurchaseStatus("requested")).toBe(false);
    expect(isNotifiablePurchaseStatus("cancelled")).toBe(false);
  });

  it("conta só as novidades depois da última visita", () => {
    const updates = [
      { id: "a", item: "A", status: "approved" as const, rejected_reason: null, updated_at: "2026-06-10T12:00:00Z" },
      { id: "b", item: "B", status: "delivered" as const, rejected_reason: null, updated_at: "2026-06-10T09:00:00Z" },
    ];
    expect(countUnseenPurchaseUpdates(updates, "2026-06-10T10:00:00Z")).toBe(1);
    expect(countUnseenPurchaseUpdates(updates, "2026-06-10T13:00:00Z")).toBe(0);
    expect(countUnseenPurchaseUpdates(updates, null)).toBe(0);
  });
});

describe("totais por projeto", () => {
  it("separa o previsto do já pago e ignora recusados e cancelados", () => {
    const totals = summarizeByProject([
      purchase({ id: "a", status: "requested", estimated_amount: 100 }),
      purchase({ id: "b", status: "approved", estimated_amount: 50 }),
      purchase({ id: "c", status: "purchased", estimated_amount: 200, actual_amount: 180 }),
      purchase({ id: "d", status: "delivered", estimated_amount: 40, actual_amount: null }),
      purchase({ id: "e", status: "rejected", estimated_amount: 999 }),
      purchase({ id: "f", status: "cancelled", estimated_amount: 999 }),
      purchase({ id: "g", status: "requested", estimated_amount: 10, project_id: "beta", project_name: "Beta" }),
    ]);
    expect(totals).toEqual([
      { projectId: "alfa", projectName: "Alfa", estimated: 150, paid: 220, count: 4 },
      { projectId: "beta", projectName: "Beta", estimated: 10, paid: 0, count: 1 },
    ]);
  });
});

describe("valores e links", () => {
  it("aceita só links http e https", () => {
    expect(isValidPurchaseUrl("https://loja.com/item?id=1")).toBe(true);
    expect(isValidPurchaseUrl("http://loja.com")).toBe(true);
    expect(isValidPurchaseUrl("javascript:alert(1)")).toBe(false);
    expect(isValidPurchaseUrl("loja.com/item")).toBe(false);
  });

  it("interpreta valores no formato brasileiro", () => {
    expect(parseMoney("129,90")).toBe(129.9);
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoney("1234.5")).toBe(1234.5);
    expect(parseMoney("50")).toBe(50);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("-5")).toBeNull();
  });

  it("valida o formulário de pedido", () => {
    const ok = { projectId: "alfa", category: "custeio", item: "Bico 0.4", url: "https://loja.com", quantity: "2", amount: "129,90", notes: "" };
    expect(validatePurchaseForm(ok)).toBeNull();
    expect(validatePurchaseForm({ ...ok, projectId: "" })).toMatch(/projeto/i);
    expect(validatePurchaseForm({ ...ok, category: "" })).toMatch(/rubrica/i);
    expect(validatePurchaseForm({ ...ok, category: "bolsas" })).toMatch(/rubrica/i);
    expect(validatePurchaseForm({ ...ok, item: "a" })).toMatch(/item/i);
    expect(validatePurchaseForm({ ...ok, url: "ftp://x" })).toMatch(/link/i);
    expect(validatePurchaseForm({ ...ok, quantity: "0" })).toMatch(/quantidade/i);
    expect(validatePurchaseForm({ ...ok, amount: "" })).toMatch(/valor/i);
    expect(validatePurchaseForm({ ...ok, url: "" })).toBeNull();
  });
});
