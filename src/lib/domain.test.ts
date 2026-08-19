import { describe, expect, it } from "vitest";

import {
  calcularDuracaoMinutos,
  buildLabScheduleTimeline,
  criarDataLocalSegura,
  getFundingAgencyLabel,
  formatSchedulePeriod,
  getScheduleSortOrder,
  getProximosStatusReserva,
  reservaBloqueiaHorario,
  reservaPodeSerCancelada,
  reservaPodeSerEditada,
  splitName,
  type PrinterBooking,
  type LabScheduleBreakItem,
  type LabSchedulePeriodItem,
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

  it("formata o turno em uma unica representacao", () => {
    expect(formatSchedulePeriod("13:30:00", "15:30:00")).toBe("13h30–15h30");
    expect(formatSchedulePeriod("08:00:00", "10:00:00")).toBe("8h–10h");
  });

  it("calcula a ordenacao tecnica a partir do horario inicial", () => {
    expect(getScheduleSortOrder("08:00")).toBe(480);
    expect(getScheduleSortOrder("13:30:00")).toBe(810);
  });

  it("intercala turnos e intervalos sem transformar intervalos em turnos", () => {
    const periods: LabSchedulePeriodItem[] = [
      { kind: "period", id: "afternoon", starts_at: "13:30", ends_at: "15:30", label: "13h30–15h30", horario: "13h30–15h30" },
      { kind: "period", id: "morning", starts_at: "10:00", ends_at: "12:00", label: "10h–12h", horario: "10h–12h" },
      { kind: "period", id: "evening", starts_at: "19:00", ends_at: "21:00", label: "19h–21h", horario: "19h–21h" },
    ];
    const breaks: LabScheduleBreakItem[] = [
      { kind: "break", id: "dinner", label: "Jantar", starts_at: "17:30", ends_at: "19:00", horario: "17h30–19h" },
      { kind: "break", id: "lunch", label: "Almoço", starts_at: "12:00", ends_at: "13:30", horario: "12h–13h30" },
    ];

    const timeline = buildLabScheduleTimeline(periods, breaks);

    expect(timeline.map((item) => item.id)).toEqual(["morning", "lunch", "afternoon", "dinner", "evening"]);
    expect(periods).toHaveLength(3);
    expect(timeline.filter((item) => item.kind === "break")).toHaveLength(2);
  });

  it("exibe a agência de fomento conhecida ou informada manualmente", () => {
    expect(getFundingAgencyLabel("cnpq")).toBe("CNPq");
    expect(getFundingAgencyLabel("other", "Fundação Local")).toBe("Fundação Local");
    expect(getFundingAgencyLabel(null)).toBeNull();
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

  it("permite editar somente reservas pendentes ou aprovadas", () => {
    expect(reservaPodeSerEditada(booking("pending"))).toBe(true);
    expect(reservaPodeSerEditada(booking("approved"))).toBe(true);
    expect(reservaPodeSerEditada(booking("in_progress"))).toBe(false);
    expect(reservaPodeSerEditada(booking("cancelled"))).toBe(false);
  });

  it("define as transicoes operacionais sem reabrir estados terminais", () => {
    expect(getProximosStatusReserva("approved")).toEqual(["in_progress", "cancelled"]);
    expect(getProximosStatusReserva("in_progress")).toEqual(["completed", "failed"]);
    expect(getProximosStatusReserva("completed")).toEqual([]);
  });
});
