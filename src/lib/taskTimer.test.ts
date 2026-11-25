import { describe, expect, it } from "vitest";

import { formatDuration, getTaskTimes, getTimerAfterStatusChange, toggleTaskTimer, type TaskTimerFields } from "./taskTimer";

const NOW = new Date("2026-11-25T12:00:00Z");

function timer(overrides: Partial<TaskTimerFields>): TaskTimerFields {
  return { status: "in_progress", work_seconds: 0, review_seconds: 0, timer_phase: null, timer_started_at: null, ...overrides };
}

describe("cronômetro das tarefas", () => {
  it("soma o trecho que está correndo na fase certa", () => {
    const task = timer({ work_seconds: 600, review_seconds: 60, timer_phase: "work", timer_started_at: "2026-11-25T11:50:00Z" });
    expect(getTaskTimes(task, NOW)).toMatchObject({ work: 1200, review: 60, total: 1260, running: true });
    const review = timer({ status: "review", work_seconds: 600, timer_phase: "review", timer_started_at: "2026-11-25T11:59:00Z" });
    expect(getTaskTimes(review, NOW)).toMatchObject({ work: 600, review: 60, total: 660 });
  });

  it("parado, mostra só o que foi guardado", () => {
    expect(getTaskTimes(timer({ work_seconds: 90, review_seconds: 30 }), NOW)).toMatchObject({ total: 120, running: false });
  });

  it("formata a duração", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(600)).toBe("10min");
    expect(formatDuration(3900)).toBe("1h 05min");
    expect(formatDuration(-5)).toBe("0s");
  });

  it("pausa guardando o tempo e retoma na fase da coluna", () => {
    const running = timer({ work_seconds: 100, timer_phase: "work", timer_started_at: "2026-11-25T11:59:00Z" });
    expect(toggleTaskTimer(running, false, NOW)).toEqual({ work_seconds: 160, review_seconds: 0, timer_started_at: null });
    expect(toggleTaskTimer(timer({ status: "review" }), true, NOW)).toEqual({ timer_started_at: NOW.toISOString(), timer_phase: "review" });
    expect(toggleTaskTimer(timer({ status: "done" }), true, NOW)).toEqual({});
  });

  it("ao mudar de coluna fecha o trecho e liga o da nova", () => {
    const running = timer({ timer_phase: "work", timer_started_at: "2026-11-25T11:50:00Z" });
    expect(getTimerAfterStatusChange(running, "review", NOW)).toEqual({
      work_seconds: 600,
      review_seconds: 0,
      timer_phase: "review",
      timer_started_at: NOW.toISOString(),
    });
    expect(getTimerAfterStatusChange(running, "done", NOW)).toEqual({ work_seconds: 600, review_seconds: 0, timer_phase: null, timer_started_at: null });
  });
});
