import { describe, expect, it } from "vitest";

import type { AvailabilitySlot } from "./domain";
import { getStatusPresenca } from "./pesquisadores";

function slot(profile_id: string, weekday: number, work_mode: AvailabilitySlot["work_mode"]): AvailabilitySlot {
  return {
    id: `${profile_id}-${weekday}-${work_mode}`,
    profile_id,
    weekday,
    starts_at: "08:00",
    ends_at: "12:00",
    schedule_period_id: "p1",
    periodo: "p1",
    work_mode,
  };
}

describe("getStatusPresenca", () => {
  const slots = [slot("ana", 2, "remote"), slot("ana", 2, "onsite"), slot("bia", 2, "aula"), slot("caio", 3, "onsite")];

  it("prioriza presencial, depois remoto e aula", () => {
    expect(getStatusPresenca("ana", slots, 2)).toBe("Presente");
    expect(getStatusPresenca("bia", slots, 2)).toBe("Em aula");
    expect(getStatusPresenca("ana", [slot("ana", 2, "remote")], 2)).toBe("Remoto");
  });

  it("fica ausente sem horário no dia ou para outra pessoa", () => {
    expect(getStatusPresenca("caio", slots, 2)).toBe("Ausente");
    expect(getStatusPresenca("dani", slots, 2)).toBe("Ausente");
  });
});
