import { describe, expect, it } from "vitest";

import type { EquipmentBooking } from "./domain";
import {
  bookingHours,
  bookingsByStatus,
  filterUsageInPeriod,
  getGranularity,
  getPeriodRange,
  sumHours,
  usageByEquipment,
  usageByWeekday,
  usageOverTime,
} from "./analytics";

function booking(id: string, start: string, end: string, status: EquipmentBooking["status"] = "completed", extra: Partial<EquipmentBooking> = {}) {
  return { id, starts_at: start, ends_at: end, status, project_name: "P", equipment: { name: "Impressora A" }, ...extra } as EquipmentBooking;
}

const now = new Date("2026-11-25T12:00:00");

describe("período", () => {
  it("volta 7, 30, 90 dias ou 12 meses a partir de agora", () => {
    expect(getPeriodRange("7d", now).from.getTime()).toBe(now.getTime() - 7 * 86_400_000);
    expect(getPeriodRange("year", now).from.getTime()).toBe(now.getTime() - 365 * 86_400_000);
  });

  it("agrupa por dia, semana ou mês conforme o período", () => {
    expect(getGranularity("30d")).toBe("day");
    expect(getGranularity("90d")).toBe("week");
    expect(getGranularity("year")).toBe("month");
  });
});

describe("uso dos equipamentos", () => {
  const range = getPeriodRange("30d", now);
  const list = [
    booking("a", "2026-11-20T10:00:00", "2026-11-20T12:30:00"),
    booking("b", "2026-11-21T10:00:00", "2026-11-21T11:00:00", "approved"),
    booking("c", "2026-11-22T10:00:00", "2026-11-22T11:00:00", "cancelled"),
    booking("d", "2026-11-23T10:00:00", "2026-11-23T11:00:00", "pending"),
    booking("e", "2026-01-01T10:00:00", "2026-01-01T11:00:00"),
  ];

  it("conta só reservas de uso dentro do período", () => {
    expect(filterUsageInPeriod(list, range).map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("calcula horas e soma por equipamento", () => {
    expect(bookingHours(list[0])).toBe(2.5);
    expect(sumHours(filterUsageInPeriod(list, range))).toBe(3.5);
    expect(usageByEquipment(filterUsageInPeriod(list, range), "?")).toEqual([{ name: "Impressora A", hours: 3.5, count: 2 }]);
  });

  it("separa por situação todas as reservas do período", () => {
    const rows = bookingsByStatus(list, range);
    expect(rows.find((row) => row.status === "cancelled")?.count).toBe(1);
    expect(rows.find((row) => row.status === "pending")?.count).toBe(1);
    expect(rows.reduce((total, row) => total + row.count, 0)).toBe(4);
  });

  it("série no tempo traz também os dias vazios", () => {
    const rows = usageOverTime(filterUsageInPeriod(list, range), range, "day");
    expect(rows.length).toBeGreaterThanOrEqual(30);
    expect(rows.find((row) => row.key === "2026-11-20")?.hours).toBe(2.5);
    expect(rows.find((row) => row.key === "2026-11-19")?.hours).toBe(0);
  });

  it("série por mês agrupa no mês", () => {
    const rows = usageOverTime(filterUsageInPeriod(list, getPeriodRange("year", now)), getPeriodRange("year", now), "month");
    expect(rows.find((row) => row.key === "2026-11")?.count).toBe(2);
    expect(rows.find((row) => row.key === "2026-01")?.count).toBe(1);
  });

  it("série por semana começa na segunda-feira", () => {
    const rows = usageOverTime([booking("w", "2026-11-25T10:00:00", "2026-11-25T11:00:00")], getPeriodRange("90d", now), "week");
    expect(rows.find((row) => row.count === 1)?.key).toBe("2026-11-23");
  });

  it("uso por dia da semana", () => {
    const rows = usageByWeekday([booking("x", "2026-11-25T10:00:00", "2026-11-25T12:00:00")]);
    expect(rows[3]).toEqual({ weekday: 3, hours: 2, count: 1 });
  });
});
