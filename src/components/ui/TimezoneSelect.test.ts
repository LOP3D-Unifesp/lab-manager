import { describe, expect, it } from "vitest";

import { getSupportedTimezones } from "./TimezoneSelect";

describe("seletor de fuso horário", () => {
  it("inclui UTC e preserva um fuso IANA já configurado", () => {
    const zones = getSupportedTimezones("Pacific/Auckland");
    expect(zones).toContain("UTC");
    expect(zones).toContain("Pacific/Auckland");
    expect(zones.length).toBeGreaterThan(5);
  });
});
