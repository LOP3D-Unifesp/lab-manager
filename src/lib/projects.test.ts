import { describe, expect, it } from "vitest";

import {
  filterProjects,
  formatProjectPeriod,
  getFundingTotal,
  getProjectErrorMessage,
  getProjectFundingTotal,
  isProjectOpen,
  parseAmountInput,
  sortProjects,
  type Project,
} from "./projects";

function project(overrides: Partial<Project>): Project {
  return {
    id: "p",
    name: "Projeto",
    description: null,
    status: "active",
    starts_on: null,
    ends_on: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    members: [],
    funding: [],
    ...overrides,
  };
}

const funding = {
  agency_id: "a",
  agency_acronym: "FAPESP",
  process_number: null,
  grant_name: null,
  starts_on: null,
  ends_on: null,
  items: [
    { category: "capital" as const, description: null, amount: 1000.5 },
    { category: "custeio" as const, description: null, amount: 200 },
  ],
};

describe("valores de fomento", () => {
  it("soma as rubricas de um fomento e de todos os fomentos do projeto", () => {
    expect(getFundingTotal(funding)).toBe(1200.5);
    expect(getProjectFundingTotal(project({ funding: [funding, funding] }))).toBe(2401);
    expect(getProjectFundingTotal(project({}))).toBe(0);
  });

  it("interpreta valores com vírgula e rejeita negativos ou texto", () => {
    expect(parseAmountInput("1234.56")).toBe(1234.56);
    expect(parseAmountInput("1.234,56")).toBe(1234.56);
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });
});

describe("lista de projetos", () => {
  const projects = [
    project({ id: "1", name: "Bio", status: "completed", funding: [funding] }),
    project({ id: "2", name: "Ótica", status: "active" }),
    project({ id: "3", name: "Aero", status: "active", funding: [funding] }),
  ];

  it("filtra por status, fomento e nome", () => {
    expect(filterProjects(projects, { status: "active", funding: "all", search: "" }).map((p) => p.id)).toEqual(["2", "3"]);
    expect(filterProjects(projects, { status: "all", funding: "funded", search: "" }).map((p) => p.id)).toEqual(["1", "3"]);
    expect(filterProjects(projects, { status: "all", funding: "unfunded", search: "" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProjects(projects, { status: "all", funding: "all", search: " aer" }).map((p) => p.id)).toEqual(["3"]);
  });

  it("ordena ativos primeiro e depois por nome", () => {
    expect(sortProjects(projects).map((p) => p.id)).toEqual(["3", "2", "1"]);
  });

  it("só aceita novas impressões em projetos abertos", () => {
    expect(isProjectOpen("active")).toBe(true);
    expect(isProjectOpen("paused")).toBe(true);
    expect(isProjectOpen("completed")).toBe(false);
    expect(isProjectOpen("archived")).toBe(false);
  });
});

describe("textos", () => {
  it("formata o período", () => {
    expect(formatProjectPeriod("2026-03-01", "2027-02-28")).toBe("01/03/2026 a 28/02/2027");
    expect(formatProjectPeriod("2026-03-01", null)).toBe("desde 01/03/2026");
    expect(formatProjectPeriod(null, null)).toBeNull();
  });

  it("traduz erros conhecidos do banco", () => {
    expect(getProjectErrorMessage(new Error('duplicate key value violates unique constraint "projects_name_key"'))).toBe(
      "Já existe um projeto com esse nome.",
    );
    expect(getProjectErrorMessage(new Error("coordinator_required"))).toContain("coordenadores");
  });
});
