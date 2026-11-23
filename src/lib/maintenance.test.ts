import { describe, expect, it } from "vitest";

import {
  formatDurationMs,
  formatMaintenanceDuration,
  getMaintenanceErrorMessage,
  getOpenEpisode,
  splitAffectedBookings,
  summarizeMaintenance,
  type BookingSlot,
  type MaintenanceEpisode,
} from "./maintenance";

const now = new Date("2026-06-10T12:00:00Z");

function episode(overrides: Partial<MaintenanceEpisode>): MaintenanceEpisode {
  return {
    id: "e",
    equipment_id: "eq1",
    reason: "Troca do bico",
    notes: null,
    expected_return_on: null,
    started_at: "2026-06-01T12:00:00Z",
    started_by_name: null,
    ended_at: null,
    ended_by_name: null,
    resolution_notes: null,
    ...overrides,
  };
}

describe("duração da manutenção", () => {
  it("escreve a duração em horas ou dias, com singular e plural", () => {
    expect(formatDurationMs(10 * 60 * 1000)).toBe("menos de 1 hora");
    expect(formatDurationMs(60 * 60 * 1000)).toBe("1 hora");
    expect(formatDurationMs(5 * 60 * 60 * 1000)).toBe("5 horas");
    expect(formatDurationMs(24 * 60 * 60 * 1000)).toBe("1 dia");
    expect(formatDurationMs(3.7 * 24 * 60 * 60 * 1000)).toBe("3 dias");
  });

  it("conta o episódio aberto até agora e o fechado até o fim", () => {
    expect(formatMaintenanceDuration("2026-06-07T12:00:00Z", null, now)).toBe("3 dias");
    expect(formatMaintenanceDuration("2026-06-07T12:00:00Z", "2026-06-08T18:00:00Z", now)).toBe("1 dia");
  });
});

describe("histórico", () => {
  it("acha o episódio aberto do equipamento", () => {
    const episodes = [episode({ id: "old", ended_at: "2026-06-02T12:00:00Z" }), episode({ id: "open" }), episode({ id: "other", equipment_id: "eq2" })];
    expect(getOpenEpisode(episodes, "eq1")?.id).toBe("open");
    expect(getOpenEpisode(episodes, "eq3")).toBeNull();
  });

  it("resume quantas vezes parou e a duração média e a maior", () => {
    const episodes = [
      episode({ id: "a", started_at: "2026-06-01T00:00:00Z", ended_at: "2026-06-03T00:00:00Z" }),
      episode({ id: "b", started_at: "2026-06-05T00:00:00Z", ended_at: "2026-06-11T00:00:00Z" }),
      episode({ id: "c", started_at: "2026-06-09T00:00:00Z" }),
    ];
    const summary = summarizeMaintenance(episodes);
    expect(summary.count).toBe(3);
    expect(summary.averageMs).toBe(4 * 24 * 60 * 60 * 1000);
    expect(summary.longestMs).toBe(6 * 24 * 60 * 60 * 1000);
    expect(summarizeMaintenance([episode({})])).toEqual({ count: 1, averageMs: null, longestMs: null });
  });
});

describe("reservas afetadas", () => {
  const booking = (id: string, start: string, end: string, status: string): BookingSlot => ({
    id,
    project_name: "Projeto",
    starts_at: start,
    ends_at: end,
    status,
    person: null,
  });

  it("separa o que pode ser cancelado do que já está rolando", () => {
    const { cancellable, running } = splitAffectedBookings(
      [
        booking("future-approved", "2026-06-12T10:00:00Z", "2026-06-12T11:00:00Z", "approved"),
        booking("future-pending", "2026-06-13T10:00:00Z", "2026-06-13T11:00:00Z", "pending"),
        booking("running", "2026-06-10T11:00:00Z", "2026-06-10T13:00:00Z", "in_progress"),
        booking("started-approved", "2026-06-10T11:30:00Z", "2026-06-10T14:00:00Z", "approved"),
        booking("finished", "2026-06-10T09:00:00Z", "2026-06-10T10:00:00Z", "approved"),
        booking("cancelled", "2026-06-14T10:00:00Z", "2026-06-14T11:00:00Z", "cancelled"),
      ],
      now,
    );
    expect(cancellable.map((b) => b.id)).toEqual(["future-approved", "future-pending"]);
    expect(running.map((b) => b.id)).toEqual(["running", "started-approved"]);
  });
});

describe("mensagens", () => {
  it("traduz erros conhecidos", () => {
    expect(getMaintenanceErrorMessage(new Error("maintenance_already_open"))).toContain("já está em manutenção");
    expect(getMaintenanceErrorMessage(new Error("not_in_maintenance"))).toContain("não está em manutenção");
    expect(getMaintenanceErrorMessage(new Error("algo diferente"))).toBe("algo diferente");
  });
});
