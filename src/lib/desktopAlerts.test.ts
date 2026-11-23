import { describe, expect, it } from "vitest";

import { describeNewRequest } from "./desktopAlerts";

describe("describeNewRequest", () => {
  it("destaca chamados urgentes no título", () => {
    expect(describeNewRequest({ urgency: "urgent", description: "Bico entupido" }, "Bambuzinha")).toEqual({
      title: "Chamado urgente: Bambuzinha",
      body: "Bico entupido",
    });
    expect(describeNewRequest({ urgency: "normal", description: "Barulho" }, "Bambuzinha").title).toBe("Novo chamado: Bambuzinha");
  });

  it("usa um texto genérico quando o equipamento não é conhecido", () => {
    expect(describeNewRequest({ urgency: "low", description: "x" }, null).title).toBe("Novo chamado: um equipamento");
  });

  it("corta descrições longas", () => {
    const body = describeNewRequest({ urgency: "normal", description: "a".repeat(300) }, "PC").body;
    expect(body.length).toBe(140);
    expect(body.endsWith("...")).toBe(true);
  });
});
