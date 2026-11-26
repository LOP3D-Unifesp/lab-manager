import { describe, expect, it } from "vitest";

import { groupSmallest, getTimeByPerson, sumTimeReport, totalReportSeconds, type TimeEntry, type TimeReportRow } from "./taskTime";

const NOW = new Date("2026-11-25T12:00:00Z");

function entry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: "e",
    profile_id: "ana",
    full_name: "Ana",
    avatar_url: null,
    phase: "work",
    started_at: "2026-11-25T10:00:00Z",
    ended_at: "2026-11-25T10:10:00Z",
    seconds: 600,
    auto_closed: false,
    ...overrides,
  };
}

describe("tempo por pessoa", () => {
  it("soma por pessoa e fase, contando o trecho aberto até agora", () => {
    const result = getTimeByPerson(
      [
        entry({ id: "1" }),
        entry({ id: "2", phase: "review", seconds: 120 }),
        entry({ id: "3", profile_id: "bia", full_name: "Bia", ended_at: null, seconds: null, started_at: "2026-11-25T11:59:00Z" }),
      ],
      { work_seconds: 600, review_seconds: 120 },
      NOW,
    );
    expect(result.people.map((p) => [p.full_name, p.work, p.review, p.total])).toEqual([
      ["Ana", 600, 120, 720],
      ["Bia", 60, 0, 60],
    ]);
    expect(result.unassigned.total).toBe(0);
  });

  it("o que não tem registro por pessoa aparece à parte", () => {
    const result = getTimeByPerson([entry({})], { work_seconds: 1000, review_seconds: 300 }, NOW);
    expect(result.unassigned).toEqual({ work: 400, review: 300, total: 700 });
  });

  it("soma o relatório por pessoa e por projeto", () => {
    const rows: TimeReportRow[] = [
      { profile_id: "a", full_name: "Ana", project_id: "p1", project_name: "Alfa", phase: "work", seconds: 100 },
      { profile_id: "a", full_name: "Ana", project_id: "p2", project_name: "Beta", phase: "review", seconds: 50 },
      { profile_id: "b", full_name: "Bia", project_id: "p1", project_name: "Alfa", phase: "work", seconds: 200 },
    ];
    expect(sumTimeReport(rows, "person").map((r) => [r.name, r.seconds])).toEqual([["Bia", 200], ["Ana", 150]]);
    expect(sumTimeReport(rows, "project").map((r) => [r.name, r.seconds])).toEqual([["Alfa", 300], ["Beta", 50]]);
    expect(totalReportSeconds(rows)).toBe(350);
  });
});

describe("fatias do gráfico de tempo", () => {
  const rows = [50, 40, 30, 20, 10].map((seconds, index) => ({ id: `p${index}`, name: `Projeto ${index}`, seconds }));

  it("mantém todos quando cabem", () => {
    expect(groupSmallest(rows, 5, "Outros")).toEqual(rows);
  });

  it("junta os menores numa fatia, sem perder tempo", () => {
    const slices = groupSmallest(rows, 3, "Outros");
    expect(slices.map((row) => [row.name, row.seconds])).toEqual([["Projeto 0", 50], ["Projeto 1", 40], ["Outros", 60]]);
  });
});
