import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSaveQueue } from "./saveQueue";

function setup() {
  const states: Array<{ status: string; failed: boolean }> = [];
  const errors: unknown[] = [];
  const queue = createSaveQueue({ onChange: (state) => states.push(state), onError: (error) => errors.push(error) }, 500);
  return { queue, states, errors, last: () => states[states.length - 1] };
}

describe("fila de gravação automática", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("grava na ordem pedida, mesmo quando a primeira demora mais", async () => {
    const { queue, last } = setup();
    const done: string[] = [];
    void queue.now("a", () => new Promise<void>((resolve) => setTimeout(() => (done.push("primeira"), resolve()), 100)));
    const end = queue.now("b", async () => void done.push("segunda"));
    await vi.advanceTimersByTimeAsync(100);
    await end;
    expect(done).toEqual(["primeira", "segunda"]);
    expect(last()).toEqual({ status: "saved", failed: false });
  });

  it("enquanto a pessoa digita, grava só a última versão", async () => {
    const { queue } = setup();
    const done: string[] = [];
    queue.later("texto", async () => void done.push("a"));
    await vi.advanceTimersByTimeAsync(300);
    queue.later("texto", async () => void done.push("ab"));
    await vi.advanceTimersByTimeAsync(499);
    expect(done).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toEqual(["ab"]);
  });

  it("ao fechar, grava na hora o que esperava", async () => {
    const { queue } = setup();
    const done: string[] = [];
    queue.later("texto", async () => void done.push("pendente"));
    await queue.flush();
    expect(done).toEqual(["pendente"]);
    expect(queue.hasSaved()).toBe(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toEqual(["pendente"]);
  });

  it("marca a falha até aquele campo gravar de novo", async () => {
    const { queue, errors, last } = setup();
    await queue.now("prazo", async () => {
      throw new Error("sem rede");
    });
    expect(errors).toHaveLength(1);
    expect(last()).toEqual({ status: "idle", failed: true });
    expect(queue.hasFailed()).toBe(true);
    expect(queue.hasSaved()).toBe(false);
    await queue.now("outro", async () => undefined);
    expect(last().failed).toBe(true);
    await queue.now("prazo", async () => undefined);
    expect(last()).toEqual({ status: "saved", failed: false });
  });

  it("descarta o que ainda não começou", async () => {
    const { queue } = setup();
    const done: string[] = [];
    queue.later("texto", async () => void done.push("x"));
    queue.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(done).toEqual([]);
  });
});
