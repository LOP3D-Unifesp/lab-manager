import { describe, expect, it } from "vitest";

import {
  buildMaintenancePurchaseNote,
  countUnseenPurchaseUpdates,
  describePurchaseUpdate,
  calculateTotal,
  filterPurchases,
  formatMoneyField,
  getUnitAmountForEdit,
  GENERAL_STOCK_LABEL,
  getPurchaseActions,
  getPurchaseUndo,
  getUnitAmount,
  isNotifiablePurchaseStatus,
  isValidPurchaseUrl,
  maskCentsInput,
  parseMaskedMoney,
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
    urgency: "normal",
    funding_category: "custeio",
    notes: null,
    status: "requested",
    decided_by_name: null,
    maintenance_request_id: null,
    maintenance_equipment_name: null,
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

  it("separa os pedidos do estoque geral dos de projeto", () => {
    const mixed = [
      purchase({ id: "g1", project_id: null, project_name: GENERAL_STOCK_LABEL }),
      purchase({ id: "p1", project_id: "alfa" }),
    ];
    const none = { status: "all" as const, projectId: "all", category: "all" as const, mine: false };
    expect(filterPurchases(mixed, { ...none, projectId: "general" }, "ana").map((item) => item.id)).toEqual(["g1"]);
    expect(filterPurchases(mixed, { ...none, projectId: "alfa" }, "ana").map((item) => item.id)).toEqual(["p1"]);
    expect(filterPurchases(mixed, none, "ana")).toHaveLength(2);
  });

  it("dentro da mesma etapa, os urgentes vêm antes e os de baixa urgência por último", () => {
    const sorted = sortPurchases([
      purchase({ id: "x", status: "requested", urgency: "low", created_at: "2026-06-01T10:00:00Z" }),
      purchase({ id: "y", status: "requested", urgency: "normal", created_at: "2026-06-02T10:00:00Z" }),
      purchase({ id: "z", status: "requested", urgency: "urgent", created_at: "2026-06-09T10:00:00Z" }),
      purchase({ id: "w", status: "approved", urgency: "urgent", created_at: "2026-06-03T10:00:00Z" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["z", "y", "x", "w"]);
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

describe("máscara de centavos", () => {
  // Simula digitar um dígito de cada vez no fim do campo.
  const typeDigits = (digits: string) => digits.split("").reduce((value, char) => maskCentsInput(value + char), "");

  it("cada dígito entra pela direita, com os centavos sempre à vista", () => {
    expect(typeDigits("1")).toBe("0,01");
    expect(typeDigits("15")).toBe("0,15");
    expect(typeDigits("150")).toBe("1,50");
    expect(typeDigits("15059")).toBe("150,59");
    expect(typeDigits("123456789")).toBe("1.234.567,89");
  });

  it("apagar remove o último dígito e esvaziar deixa o campo vazio", () => {
    expect(maskCentsInput("150,5")).toBe("15,05");
    expect(maskCentsInput("0,0")).toBe("");
    expect(maskCentsInput("")).toBe("");
  });

  it("digitar com o texto selecionado recomeça do zero (5 vira 0,05)", () => {
    expect(maskCentsInput("5")).toBe("0,05");
  });

  it("ignora letras, pontos e vírgulas digitados", () => {
    expect(maskCentsInput("1a5.0")).toBe("1,50");
    expect(maskCentsInput("abc")).toBe("");
    expect(maskCentsInput("0")).toBe("");
  });

  it("colar um valor completo é respeitado", () => {
    expect(maskCentsInput("1.234,56", true)).toBe("1.234,56");
    expect(maskCentsInput("1234.56", true)).toBe("1.234,56");
    expect(maskCentsInput("R$ 99,9", true)).toBe("99,90");
    expect(maskCentsInput("1234", true)).toBe("1.234,00");
    expect(maskCentsInput("1.234", true)).toBe("1.234,00");
  });

  it("formata um valor numérico para o campo", () => {
    expect(formatMoneyField(1234.5)).toBe("1.234,50");
    expect(formatMoneyField(0.07)).toBe("0,07");
    expect(formatMoneyField(150.59)).toBe("150,59");
    expect(formatMoneyField(301.18)).toBe("301,18");
  });

  it("o texto da máscara é lido de volta com o mesmo valor", () => {
    expect(parseMaskedMoney(typeDigits("15059"))).toBe(150.59);
    expect(parseMaskedMoney(typeDigits("123456789"))).toBe(1234567.89);
  });
});

describe("valor unitário e total", () => {
  it("multiplica o valor unitário pela quantidade", () => {
    expect(calculateTotal(75.3, 2)).toBe(150.6);
    expect(calculateTotal(129.9, 3)).toBe(389.7);
    expect(calculateTotal(0.1, 3)).toBe(0.3);
    expect(calculateTotal(75.295, 2)).toBe(150.59);
  });

  it("recupera o valor unitário de um pedido antigo ao editar", () => {
    expect(getUnitAmountForEdit(150.6, 2)).toBe(75.3);
    expect(getUnitAmountForEdit(100, 1)).toBe(100);
    expect(getUnitAmountForEdit(301.18, 2)).toBe(150.59);
  });

  it("mostra o valor unitário só quando fecha certinho com a quantidade", () => {
    expect(getUnitAmount(150.6, 2)).toBe(75.3);
    expect(getUnitAmount(150.59, 2)).toBeNull();
    expect(getUnitAmount(100, 1)).toBeNull();
  });
});

describe("pedido feito a partir de um chamado", () => {
  it("resume o chamado nas observações do pedido", () => {
    expect(buildMaintenancePurchaseNote("Bambuzinha", "Bico entupido\n e   peças soltas")).toBe(
      "Para o chamado de manutenção em Bambuzinha: Bico entupido e peças soltas",
    );
  });

  it("corta descrições muito longas", () => {
    const note = buildMaintenancePurchaseNote("PC", "a".repeat(500));
    expect(note.endsWith("...")).toBe(true);
    expect(note.length).toBeLessThan(360);
  });
});

describe("totais por projeto", () => {
  it("agrupa o estoque geral como um item à parte do resumo", () => {
    const totals = summarizeByProject([
      purchase({ id: "a", status: "requested", estimated_amount: 100 }),
      purchase({ id: "b", status: "requested", estimated_amount: 30, project_id: null, project_name: GENERAL_STOCK_LABEL }),
    ]);
    expect(totals.map((total) => [total.projectId, total.estimated])).toEqual([["alfa", 100], ["general", 30]]);
  });

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
    expect(parseMoney("75,295")).toBeNull();
    expect(parseMoney("75,295", 4)).toBe(75.295);
    expect(parseMoney("-5")).toBeNull();
  });

  it("valida o formulário de pedido", () => {
    const ok = { projectId: "alfa", category: "custeio", urgency: "normal", item: "Bico 0.4", url: "https://loja.com", quantity: "2", amount: "129,90", notes: "" };
    expect(validatePurchaseForm(ok)).toBeNull();
    expect(validatePurchaseForm({ ...ok, projectId: "" })).toMatch(/projeto/i);
    expect(validatePurchaseForm({ ...ok, category: "" })).toMatch(/rubrica/i);
    expect(validatePurchaseForm({ ...ok, category: "bolsas" })).toMatch(/rubrica/i);
    expect(validatePurchaseForm({ ...ok, urgency: "" })).toMatch(/urgência/i);
    expect(validatePurchaseForm({ ...ok, item: "a" })).toMatch(/item/i);
    expect(validatePurchaseForm({ ...ok, url: "ftp://x" })).toMatch(/link/i);
    expect(validatePurchaseForm({ ...ok, quantity: "0" })).toMatch(/quantidade/i);
    expect(validatePurchaseForm({ ...ok, amount: "" })).toMatch(/valor/i);
    expect(validatePurchaseForm({ ...ok, url: "" })).toBeNull();
  });
});
