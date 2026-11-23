import { describe, expect, it } from "vitest";

import { findBookingConflicts, getBlockState, getRelevantBlocks, validateMaintenanceInterval, type BookingSlot } from "./maintenance";

const now = new Date("2026-06-10T12:00:00Z");
const at = (iso: string) => new Date(iso);

describe("bloqueios de manutenção", () => {
  it("classifica o bloqueio como em curso, futuro ou passado", () => {
    expect(getBlockState({ starts_at: "2026-06-10T10:00:00Z", ends_at: "2026-06-10T14:00:00Z" }, now)).toBe("active");
    expect(getBlockState({ starts_at: "2026-06-11T10:00:00Z", ends_at: "2026-06-11T14:00:00Z" }, now)).toBe("upcoming");
    expect(getBlockState({ starts_at: "2026-06-09T10:00:00Z", ends_at: "2026-06-10T12:00:00Z" }, now)).toBe("past");
  });

  it("mantém só os bloqueios que ainda interessam, em ordem", () => {
    const blocks = [
      { id: "far", starts_at: "2026-06-20T10:00:00Z", ends_at: "2026-06-21T10:00:00Z" },
      { id: "old", starts_at: "2026-06-01T10:00:00Z", ends_at: "2026-06-02T10:00:00Z" },
      { id: "now", starts_at: "2026-06-10T08:00:00Z", ends_at: "2026-06-10T18:00:00Z" },
    ];
    expect(getRelevantBlocks(blocks, now).map((b) => b.id)).toEqual(["now", "far"]);
  });
});

describe("conflito com reservas", () => {
  const booking = (id: string, start: string, end: string, status = "approved"): BookingSlot => ({
    id,
    project_name: "Projeto",
    starts_at: start,
    ends_at: end,
    status,
    person: null,
  });
  const bookings = [
    booking("a", "2026-06-12T10:00:00Z", "2026-06-12T12:00:00Z"),
    booking("b", "2026-06-12T12:00:00Z", "2026-06-12T13:00:00Z", "pending"),
    booking("c", "2026-06-12T09:00:00Z", "2026-06-12T10:00:00Z", "cancelled"),
    booking("d", "2026-06-13T10:00:00Z", "2026-06-13T11:00:00Z", "in_progress"),
  ];

  it("lista as reservas ativas que se sobrepõem ao intervalo", () => {
    expect(findBookingConflicts(bookings, at("2026-06-12T11:00:00Z"), at("2026-06-12T12:30:00Z")).map((x) => x.id)).toEqual(["a", "b"]);
    expect(findBookingConflicts(bookings, at("2026-06-12T08:00:00Z"), at("2026-06-14T00:00:00Z")).map((x) => x.id)).toEqual(["a", "b", "d"]);
  });

  it("não conta reservas encostadas nem canceladas", () => {
    expect(findBookingConflicts(bookings, at("2026-06-12T13:00:00Z"), at("2026-06-12T15:00:00Z"))).toEqual([]);
    expect(findBookingConflicts(bookings, at("2026-06-12T09:00:00Z"), at("2026-06-12T10:00:00Z"))).toEqual([]);
  });
});

describe("validação do intervalo", () => {
  it("aceita um intervalo futuro, inclusive de vários dias", () => {
    expect(validateMaintenanceInterval(at("2026-06-11T10:00:00Z"), at("2026-06-18T10:00:00Z"), now)).toBeNull();
  });

  it("recusa datas ausentes, fim antes do início e início no passado", () => {
    expect(validateMaintenanceInterval(null, at("2026-06-18T10:00:00Z"), now)).toContain("Informe");
    expect(validateMaintenanceInterval(at("2026-06-12T10:00:00Z"), at("2026-06-12T09:00:00Z"), now)).toContain("depois do início");
    expect(validateMaintenanceInterval(at("2026-06-10T11:00:00Z"), at("2026-06-10T13:00:00Z"), now)).toContain("no futuro");
  });
});
