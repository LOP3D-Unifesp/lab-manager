import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./relativeTime";

const NOW = new Date("2026-11-24T12:00:00Z").getTime();

describe("formatRelativeTime", () => {
  it("usa minutos, horas e dias", () => {
    expect(formatRelativeTime(NOW - 5 * 60_000, "en", NOW)).toMatch(/5/);
    expect(formatRelativeTime(NOW - 2 * 3_600_000, "en", NOW)).toMatch(/2/);
    expect(formatRelativeTime(NOW - 3 * 86_400_000, "en", NOW)).toMatch(/3/);
  });

  it("trata menos de um minuto como agora", () => {
    expect(formatRelativeTime(NOW - 10_000, "en", NOW)).toBe("this minute");
  });

  it("devolve vazio depois de uma semana", () => {
    expect(formatRelativeTime(NOW - 8 * 86_400_000, "pt-BR", NOW)).toBe("");
  });

  it("entende datas futuras", () => {
    expect(formatRelativeTime(NOW + 2 * 3_600_000, "en", NOW)).toMatch(/in 2/);
  });
});
