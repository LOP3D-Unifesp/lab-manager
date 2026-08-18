import { describe, expect, it } from "vitest";

import {
  calcularDuracaoMinutos,
  criarDataLocalSegura,
  periodoFromTimes,
  reservaBloqueiaHorario,
  reservaPodeSerCancelada,
  splitName,
  type PrinterBooking,
} from "./domain";

function booking(status: PrinterBooking["status"]): PrinterBooking {
  return {
    id: "booking",
    printer_id: "printer",
    profile_id: "profile",
    material_id: "material",
    project_name: "Projeto",
    starts_at: "2030-01-01T10:00:00Z",
    ends_at: "2030-01-01T11:00:00Z",
    estimated_duration_minutes: 60,
    status,
    notes: null,
    cancelled_at: null,
    cancelled_by: null,
  };
}

describe("regras de data e duracao", () => {
  it("aceita data local valida e rejeita datas impossiveis", () => {
    const valid = criarDataLocalSegura("2028-02-29", "13:30");
    expect(valid?.getFullYear()).toBe(2028);
    expect(valid?.getMonth()).toBe(1);
    expect(valid?.getDate()).toBe(29);
    expect(criarDataLocalSegura("2027-02-29", "13:30")).toBeNull();
    expect(criarDataLocalSegura("2028-02-29", "24:00")).toBeNull();
  });

  it("limita duracoes a incrementos de 30 minutos entre 30 minutos e 24 horas", () => {
    expect(calcularDuracaoMinutos("0.5")).toBe(30);
    expect(calcularDuracaoMinutos("24")).toBe(1440);
    expect(calcularDuracaoMinutos("0.25")).toBeNull();
    expect(calcularDuracaoMinutos("24.5")).toBeNull();
    expect(calcularDuracaoMinutos("invalido")).toBeNull();
  });
});

describe("regras de dominio", () => {
  it("separa primeiro nome e sobrenome", () => {
    expect(splitName("  Ada Lovelace  ")).toEqual({ firstName: "Ada", lastName: "Lovelace" });
    expect(splitName("Pelé")).toEqual({ firstName: "Pelé", lastName: "" });
  });

  it("mapeia horarios conhecidos para blocos", () => {
    expect(periodoFromTimes("13:30:00", "15:30:00")).toBe("b3");
  });

  it.each(["pending", "approved", "in_progress"] as const)(
    "%s bloqueia o horario",
    (status) => expect(reservaBloqueiaHorario(booking(status))).toBe(true),
  );

  it.each(["completed", "cancelled", "failed"] as const)(
    "%s libera o horario",
    (status) => expect(reservaBloqueiaHorario(booking(status))).toBe(false),
  );

  it("permite cancelar somente reservas pendentes ou aprovadas", () => {
    expect(reservaPodeSerCancelada(booking("pending"))).toBe(true);
    expect(reservaPodeSerCancelada(booking("approved"))).toBe(true);
    expect(reservaPodeSerCancelada(booking("in_progress"))).toBe(false);
    expect(reservaPodeSerCancelada(booking("completed"))).toBe(false);
  });
});
