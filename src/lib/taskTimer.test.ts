import { describe, expect, it } from "vitest";

import { formatClock, formatDuration, getMyTimer, getTaskTimes, getTimerAfterStatusChange, toggleTaskTimer, type RunningTimer, type TaskTimerFields } from "./taskTimer";

const NOW = new Date("2026-11-25T12:00:00Z");
const ana = { profile_id: "ana", full_name: "Ana", avatar_url: null };
const bia = { profile_id: "bia", full_name: "Bia", avatar_url: null };

function running(person: typeof ana, startedAt: string, phase: RunningTimer["phase"] = "work"): RunningTimer {
  return { ...person, phase, started_at: startedAt };
}

function timer(overrides: Partial<TaskTimerFields>): TaskTimerFields {
  return { status: "in_progress", work_seconds: 0, review_seconds: 0, running: [], ...overrides };
}

describe("cronômetro das tarefas (por pessoa)", () => {
  it("soma o trecho de cada pessoa na fase certa", () => {
    const task = timer({
      work_seconds: 600,
      review_seconds: 60,
      running: [running(ana, "2026-11-25T11:50:00Z"), running(bia, "2026-11-25T11:59:00Z", "review")],
    });
    expect(getTaskTimes(task, NOW)).toMatchObject({ work: 1200, review: 120, total: 1320, running: true, count: 2 });
  });

  it("parado, mostra só o que foi guardado", () => {
    expect(getTaskTimes(timer({ work_seconds: 90, review_seconds: 30 }), NOW)).toMatchObject({ total: 120, running: false, count: 0 });
  });

  it("acha o timer da própria pessoa", () => {
    const task = timer({ running: [running(ana, "2026-11-25T11:50:00Z")] });
    expect(getMyTimer(task, "ana")?.profile_id).toBe("ana");
    expect(getMyTimer(task, "bia")).toBeNull();
    expect(getMyTimer(task, undefined)).toBeNull();
  });

  it("formata a duração e o relógio", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(600)).toBe("10min");
    expect(formatDuration(3900)).toBe("1h 05min");
    expect(formatDuration(-5)).toBe("0s");
    expect(formatClock(0)).toBe("0:00:00");
    expect(formatClock(252)).toBe("0:04:12");
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("pausar mexe só no timer de quem pausou", () => {
    const task = timer({ work_seconds: 100, running: [running(ana, "2026-11-25T11:59:00Z"), running(bia, "2026-11-25T11:58:00Z")] });
    const result = toggleTaskTimer(task, false, NOW, ana);
    expect(result.work_seconds).toBe(160);
    expect(result.running?.map((r) => r.profile_id)).toEqual(["bia"]);
  });

  it("retomar liga o timer na fase da coluna, sem duplicar", () => {
    const review = timer({ status: "review" });
    expect(toggleTaskTimer(review, true, NOW, ana).running).toEqual([{ ...ana, phase: "review", started_at: NOW.toISOString() }]);
    const already = timer({ running: [running(ana, "2026-11-25T11:59:00Z")] });
    expect(toggleTaskTimer(already, true, NOW, ana)).toEqual({});
    expect(toggleTaskTimer(timer({ status: "done" }), true, NOW, ana)).toEqual({});
  });

  it("entre andamento e revisão quem está trabalhando continua; A fazer e Finalizado param todos", () => {
    const task = timer({ running: [running(ana, "2026-11-25T11:50:00Z")] });
    const toReview = getTimerAfterStatusChange(task, "review", NOW);
    expect(toReview.work_seconds).toBe(600);
    expect(toReview.running).toEqual([{ ...ana, phase: "review", started_at: NOW.toISOString() }]);
    expect(getTimerAfterStatusChange(task, "done", NOW)).toEqual({ work_seconds: 600, review_seconds: 0, running: [] });
    expect(getTimerAfterStatusChange(timer({ status: "todo" }), "in_progress", NOW).running).toEqual([]);
  });
});
