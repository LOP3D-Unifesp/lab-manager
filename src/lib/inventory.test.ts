import { describe, expect, it } from "vitest";

import {
  filterSpools,
  formatAmount,
  getInventoryErrorMessage,
  getSpoolLabel,
  getSpoolRemainingPercent,
  getSpoolsForBooking,
  isSpoolLow,
  isSpoolUsable,
  parseAmount,
  type MaterialSpool,
  type SpoolFilters,
} from "./inventory";

function spool(overrides: Partial<MaterialSpool>): MaterialSpool {
  return {
    id: "s",
    material_id: "pla",
    material_name: "PLA",
    unit: "g",
    color_name: "Branco",
    color_hex: null,
    manufacturer: null,
    diameter_mm: null,
    lot_number: null,
    initial_amount: 1000,
    current_amount: 1000,
    status: "sealed",
    project_id: null,
    project_name: null,
    storage_location: null,
    opened_on: null,
    last_dried_on: null,
    notes: null,
    ...overrides,
  };
}

describe("rolos", () => {
  it("só considera utilizável o rolo lacrado ou em uso com peso", () => {
    expect(isSpoolUsable(spool({}))).toBe(true);
    expect(isSpoolUsable(spool({ status: "in_use", current_amount: 10 }))).toBe(true);
    expect(isSpoolUsable(spool({ status: "empty", current_amount: 0 }))).toBe(false);
    expect(isSpoolUsable(spool({ status: "discarded" }))).toBe(false);
    expect(isSpoolUsable(spool({ status: "in_use", current_amount: 0 }))).toBe(false);
  });

  it("calcula o percentual restante e o alerta de pouco restante", () => {
    expect(getSpoolRemainingPercent(spool({ current_amount: 250 }))).toBe(25);
    expect(getSpoolRemainingPercent(spool({ current_amount: 0 }))).toBe(0);
    expect(isSpoolLow(spool({ status: "in_use", current_amount: 200 }))).toBe(true);
    expect(isSpoolLow(spool({ status: "in_use", current_amount: 210 }))).toBe(false);
    expect(isSpoolLow(spool({ status: "empty", current_amount: 0 }))).toBe(false);
  });

  it("formata quantidades e o rótulo do rolo", () => {
    expect(formatAmount(640, "g")).toBe("640 g");
    expect(formatAmount(1234.5, "ml")).toBe("1.234,5 ml");
    expect(getSpoolLabel(spool({ manufacturer: "eSun", current_amount: 640 }))).toBe("Branco · eSun · 640 g");
    expect(getSpoolLabel(spool({ current_amount: 640 }))).toBe("Branco · 640 g");
  });

  it("interpreta quantidades com vírgula e rejeita negativas ou texto", () => {
    expect(parseAmount("250")).toBe(250);
    expect(parseAmount("1.250,5")).toBe(1250.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("lista e escolha de rolos", () => {
  const spools = [
    spool({ id: "a", color_name: "Branco", project_id: null, current_amount: 800 }),
    spool({ id: "b", color_name: "Preto", project_id: "p1", current_amount: 900, project_name: "Mio3D" }),
    spool({ id: "c", color_name: "Azul", project_id: "p2", current_amount: 100, status: "in_use" }),
    spool({ id: "d", material_id: "petg", material_name: "PETG", project_id: null, current_amount: 500 }),
    spool({ id: "e", color_name: "Vermelho", project_id: null, current_amount: 0, status: "empty" }),
  ];
  const all: SpoolFilters = { search: "", materialId: "all", projectId: "all", status: "all", lowOnly: false };
  const ids = (list: MaterialSpool[]) => list.map((s) => s.id);

  it("filtra por material, projeto, situação, pouco restante e busca", () => {
    expect(ids(filterSpools(spools, { ...all, materialId: "petg" }))).toEqual(["d"]);
    expect(ids(filterSpools(spools, { ...all, projectId: "general" }))).toEqual(["a", "d", "e"]);
    expect(ids(filterSpools(spools, { ...all, projectId: "p1" }))).toEqual(["b"]);
    expect(ids(filterSpools(spools, { ...all, status: "available" }))).toEqual(["a", "b", "c", "d"]);
    expect(ids(filterSpools(spools, { ...all, status: "empty" }))).toEqual(["e"]);
    expect(ids(filterSpools(spools, { ...all, lowOnly: true }))).toEqual(["c"]);
    expect(ids(filterSpools(spools, { ...all, search: "  preto" }))).toEqual(["b"]);
  });

  it("para a reserva, lista os do material, do projeto ou gerais, com os do projeto primeiro", () => {
    expect(ids(getSpoolsForBooking(spools, "pla", "p1"))).toEqual(["b", "a"]);
    expect(ids(getSpoolsForBooking(spools, "pla", "p2"))).toEqual(["c", "a"]);
    expect(ids(getSpoolsForBooking(spools, "petg", "p1"))).toEqual(["d"]);
  });

  it("mantém o rolo atual ao editar mesmo se já estiver vazio", () => {
    expect(ids(getSpoolsForBooking(spools, "pla", "p1", "e"))).toEqual(["b", "a", "e"]);
  });
});

describe("mensagens de erro", () => {
  it("traduz erros conhecidos", () => {
    expect(getInventoryErrorMessage(new Error("spool_not_available"))).toContain("não está disponível");
    expect(getInventoryErrorMessage(new Error('violates check constraint "material_spools_current_amount_check"'))).toContain("peso inicial");
    expect(getInventoryErrorMessage(new Error("algo diferente"))).toBe("algo diferente");
  });
});
