import { describe, expect, it } from "vitest";

import { averageLeadTime, getLeadTimeSeconds } from "./taskLeadTime";

describe("tempo até concluir a tarefa", () => {
  it("é da criação até a conclusão, e nulo enquanto não concluída", () => {
    expect(getLeadTimeSeconds({ created_at: "2026-11-20T10:00:00Z", completed_at: "2026-11-23T10:00:00Z" })).toBe(3 * 86400);
    expect(getLeadTimeSeconds({ created_at: "2026-11-20T10:00:00Z", completed_at: null })).toBeNull();
  });

  it("faz a média só das concluídas no período", () => {
    const tasks = [
      { created_at: "2026-11-01T00:00:00Z", completed_at: "2026-11-03T00:00:00Z" },
      { created_at: "2026-11-01T00:00:00Z", completed_at: "2026-11-05T00:00:00Z" },
      { created_at: "2026-10-01T00:00:00Z", completed_at: "2026-10-02T00:00:00Z" },
      { created_at: "2026-11-01T00:00:00Z", completed_at: null },
    ];
    const range = { from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-12-01T00:00:00Z") };
    expect(averageLeadTime(tasks, range)).toBe(3 * 86400);
    expect(averageLeadTime(tasks)).toBe(Math.round((2 + 4 + 1) * 86400 / 3));
    expect(averageLeadTime([], range)).toBeNull();
  });
});
