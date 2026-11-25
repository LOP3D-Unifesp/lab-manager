import { describe, expect, it } from "vitest";

import {
  calcularDuracaoMinutos,
  buildLabScheduleTimeline,
  criarDataLocalSegura,
  criarDataNoFuso,
  getDataNoFuso,
  getHorarioNoFuso,
  gerarHorariosReserva,
  findConflictingBooking,
  findConflictingMaintenanceBlock,
  getClasseContador,
  getCorDia,
  getCorReserva,
  getDiaAbreviado,
  getDuracaoPeriodoEmHoras,
  getFundingAgencyLabel,
  getMensagemErroReserva,
  equipmentUsesMaterial,
  getRoleLabel,
  getSlotColorClassName,
  emptyGrant,
  fundingAgencyOptions,
  getEffectiveWeeklyHours,
  isGrantActive,
  validateGrant,
  getTotalWeeklyGrantHours,
  getWorkModeLabel,
  formatSchedulePeriod,
  getScheduleSortOrder,
  getProximosStatusReserva,
  intervalosSeCruzam,
  isSameSlot,
  normalizarCpf,
  normalizarTextoOpcional,
  equipmentAcceptsMaterial,
  reservaApareceNaAgenda,
  reservaBloqueiaHorario,
  reservaPodeSerCancelada,
  reservaPodeSerEditada,
  splitName,
  validarLattes,
  type MaintenanceBlock,
  type EquipmentBooking,
  type FundingGrant,
  type LabScheduleBreakItem,
  type LabSchedulePeriodItem,
} from "./domain";

function grant(overrides: Partial<FundingGrant> = {}): FundingGrant {
  return { ...emptyGrant(), ...overrides };
}

function booking(status: EquipmentBooking["status"], overrides: Partial<EquipmentBooking> = {}): EquipmentBooking {
  return {
    id: "booking",
    equipment_id: "equipment",
    profile_id: "profile",
    material_id: "material",
    spool_id: null,
    consumed_amount: null,
    project_id: null,
    project_name: "Projeto",
    starts_at: "2030-01-01T10:00:00Z",
    ends_at: "2030-01-01T11:00:00Z",
    estimated_duration_minutes: 60,
    status,
    notes: null,
    cancelled_at: null,
    cancelled_by: null,
    rejected_reason: null,
    rejected_at: null,
    rejected_by: null,
    approved_at: null,
    approved_by: null,
    ...overrides,
  };
}

function maintenanceBlock(overrides: Partial<MaintenanceBlock> = {}): MaintenanceBlock {
  return {
    id: "block",
    equipment_id: "equipment",
    created_by: "coordinator",
    starts_at: "2030-01-01T10:00:00Z",
    ends_at: "2030-01-01T11:00:00Z",
    reason: "Manutencao preventiva",
    notes: null,
    created_at: "2030-01-01T00:00:00Z",
    updated_at: "2030-01-01T00:00:00Z",
    ...overrides,
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

  it("interpreta data e horario no fuso do laboratorio", () => {
    const saoPaulo = criarDataNoFuso("2030-01-01", "10:00", "America/Sao_Paulo");
    expect(saoPaulo?.toISOString()).toBe("2030-01-01T13:00:00.000Z");

    const toquio = criarDataNoFuso("2030-01-01", "10:00", "Asia/Tokyo");
    expect(toquio?.toISOString()).toBe("2030-01-01T01:00:00.000Z");

    expect(criarDataNoFuso("2030-01-01", "24:00", "America/Sao_Paulo")).toBeNull();
    expect(criarDataNoFuso("data-invalida", "10:00", "America/Sao_Paulo")).toBeNull();
  });

  it("extrai data e horario de um instante no fuso informado", () => {
    const instante = new Date("2030-01-01T13:00:00.000Z");
    expect(getDataNoFuso(instante, "America/Sao_Paulo")).toBe("2030-01-01");
    expect(getHorarioNoFuso(instante, "America/Sao_Paulo")).toBe("10:00");
    expect(getDataNoFuso(instante, "Asia/Tokyo")).toBe("2030-01-01");
    expect(getHorarioNoFuso(instante, "Asia/Tokyo")).toBe("22:00");
  });

  it("gera slots de reserva a partir dos turnos ativos e expande para reservas existentes", () => {
    const periodos = [
      { starts_at: "08:00", ends_at: "12:00", is_active: true },
      { starts_at: "14:00", ends_at: "18:00", is_active: true },
      { starts_at: "22:00", ends_at: "23:00", is_active: false },
    ];

    const slots = gerarHorariosReserva(periodos, [], "America/Sao_Paulo");
    expect(slots[0]).toBe("08:00");
    expect(slots[slots.length - 1]).toBe("18:00");
    expect(slots).not.toContain("22:00");

    const semTurnos = gerarHorariosReserva([], [], "America/Sao_Paulo");
    expect(semTurnos[0]).toBe("09:00");
    expect(semTurnos[semTurnos.length - 1]).toBe("18:00");

    const reservaFora = [
      { starts_at: "2030-01-01T10:00:00.000Z", ends_at: "2030-01-01T10:30:00.000Z" },
    ];
    const expandido = gerarHorariosReserva([], reservaFora, "America/Sao_Paulo");
    expect(expandido[0]).toBe("07:00");
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

  it("tira o SUS das agências (as bolsas são pagas pela FAP) e mostra o SUS antigo como FAP", () => {
    expect(fundingAgencyOptions.map((option) => option.value)).not.toContain("sus");
    expect(getFundingAgencyLabel("sus")).toBe("FAP");
  });

  it("soma a carga horária semanal só das bolsas vigentes", () => {
    const today = "2026-11-25";
    expect(
      getTotalWeeklyGrantHours(
        [
          grant({ weekly_hours: 12, start_date: "2026-01-01", end_date: "2026-12-31" }),
          grant({ agency: "fapesp", weekly_hours: 8 }),
          grant({ weekly_hours: 20, start_date: "2025-01-01", end_date: "2025-12-31" }),
          grant({ weekly_hours: 6, start_date: "2027-01-01", end_date: "2027-12-31" }),
        ],
        today,
      ),
    ).toBe(20);
    expect(getTotalWeeklyGrantHours([grant({ weekly_hours: null })], today)).toBe(0);
    expect(getTotalWeeklyGrantHours([], today)).toBe(0);
  });

  it("sabe se a bolsa está vigente na data", () => {
    expect(isGrantActive({ start_date: "2026-11-25", end_date: "2026-11-25" }, "2026-11-25")).toBe(true);
    expect(isGrantActive({ start_date: "2026-11-26", end_date: null }, "2026-11-25")).toBe(false);
    expect(isGrantActive({ start_date: null, end_date: "2026-11-24" }, "2026-11-25")).toBe(false);
    expect(isGrantActive({ start_date: null, end_date: null }, "2026-11-25")).toBe(true);
  });

  it("usa a soma das bolsas vigentes e, sem elas, a carga informada à mão", () => {
    const today = "2026-11-25";
    const grants = [grant({ weekly_hours: 20 })];
    expect(getEffectiveWeeklyHours(grants, "12", today)).toBe(20);
    expect(getEffectiveWeeklyHours([], "12", today)).toBe(12);
    expect(getEffectiveWeeklyHours([], "", today)).toBe(0);
    expect(getEffectiveWeeklyHours([], "abc", today)).toBe(0);
    expect(getEffectiveWeeklyHours([grant({ weekly_hours: 20, end_date: "2026-01-01" })], "10", today)).toBe(10);
  });

  it("valida os campos que a bolsa exige; só o número do processo é opcional", () => {
    const ok = grant({ project_id: "p1", monthly_value: 700, start_date: "2026-03-01", end_date: "2027-02-28", weekly_hours: 20 });
    expect(validateGrant(ok)).toBeNull();
    expect(validateGrant({ ...ok, process_number: "2025/12345-6" })).toBeNull();
    expect(validateGrant({ ...ok, project_id: null })).toBe("project");
    expect(validateGrant({ ...ok, monthly_value: null })).toBe("monthlyValue");
    expect(validateGrant({ ...ok, monthly_value: -1 })).toBe("monthlyValue");
    expect(validateGrant({ ...ok, start_date: null })).toBe("startDate");
    expect(validateGrant({ ...ok, end_date: null })).toBe("endDate");
    expect(validateGrant({ ...ok, end_date: "2026-02-01" })).toBe("dateOrder");
    expect(validateGrant({ ...ok, weekly_hours: null })).toBe("weeklyHours");
    expect(validateGrant({ ...ok, weekly_hours: 61 })).toBe("weeklyHours");
    expect(validateGrant({ ...ok, agency: "other", agency_other: " " })).toBe("agency");
  });

  it.each(["pending", "approved", "in_progress"] as const)(
    "%s bloqueia o horario",
    (status) => expect(reservaBloqueiaHorario(booking(status))).toBe(true),
  );

  it.each(["completed", "cancelled", "rejected", "failed"] as const)(
    "%s libera o horario",
    (status) => expect(reservaBloqueiaHorario(booking(status))).toBe(false),
  );

  it.each(["pending", "approved", "in_progress", "completed", "failed"] as const)(
    "%s permanece na agenda do dia",
    (status) => expect(reservaApareceNaAgenda(booking(status))).toBe(true),
  );

  it.each(["cancelled", "rejected"] as const)(
    "%s sai da agenda do dia",
    (status) => expect(reservaApareceNaAgenda(booking(status))).toBe(false),
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
    expect(getProximosStatusReserva("pending")).toEqual(["approved", "rejected", "cancelled"]);
    expect(getProximosStatusReserva("approved")).toEqual(["in_progress", "cancelled"]);
    expect(getProximosStatusReserva("in_progress")).toEqual(["completed", "failed"]);
    expect(getProximosStatusReserva("rejected")).toEqual([]);
    expect(getProximosStatusReserva("completed")).toEqual([]);
  });
});

describe("conflitos de reserva e manutencao", () => {
  it("detecta intervalos que se cruzam e libera intervalos adjacentes", () => {
    const inicio = new Date("2030-01-01T10:00:00Z");
    const fim = new Date("2030-01-01T11:00:00Z");

    expect(intervalosSeCruzam(inicio, fim, new Date("2030-01-01T10:30:00Z"), new Date("2030-01-01T11:30:00Z"))).toBe(true);
    expect(intervalosSeCruzam(inicio, fim, new Date("2030-01-01T11:00:00Z"), new Date("2030-01-01T12:00:00Z"))).toBe(false);
    expect(intervalosSeCruzam(inicio, fim, new Date("2030-01-01T09:00:00Z"), new Date("2030-01-01T10:00:00Z"))).toBe(false);
  });

  it("verifica se a impressora aceita o material informado", () => {
    const equipmentMaterials = [{ equipment_id: "equipment-a", material_id: "pla" }];

    expect(equipmentAcceptsMaterial(equipmentMaterials, "equipment-a", "pla")).toBe(true);
    expect(equipmentAcceptsMaterial(equipmentMaterials, "equipment-a", "petg")).toBe(false);
    expect(equipmentAcceptsMaterial(equipmentMaterials, "equipment-b", "pla")).toBe(false);
  });

  it("encontra reserva conflitante ignorando a reserva em edicao e estados terminais", () => {
    const inicio = new Date("2030-01-01T10:00:00Z");
    const fim = new Date("2030-01-01T11:00:00Z");
    const conflitante = booking("approved", { id: "outra" });
    const emEdicao = booking("approved", { id: "editando" });
    const finalizada = booking("completed", { id: "finalizada" });

    expect(findConflictingBooking([conflitante, emEdicao, finalizada], inicio, fim, "editando")).toBe(conflitante);
    expect(findConflictingBooking([emEdicao], inicio, fim, "editando")).toBeNull();
    expect(findConflictingBooking([finalizada], inicio, fim, null)).toBeNull();
  });

  it("encontra bloqueio de manutencao que cruza o horario selecionado", () => {
    const inicio = new Date("2030-01-01T10:00:00Z");
    const fim = new Date("2030-01-01T11:00:00Z");
    const bloqueio = maintenanceBlock({ id: "bloqueio", starts_at: "2030-01-01T10:30:00Z", ends_at: "2030-01-01T12:00:00Z" });

    expect(findConflictingMaintenanceBlock([bloqueio], inicio, fim)).toBe(bloqueio);
    expect(findConflictingMaintenanceBlock([], inicio, fim)).toBeNull();
  });

  it("atribui cor deterministica por reserva independente da lista", () => {
    const reservas = [booking("approved", { id: "a" }), booking("approved", { id: "b" })];

    expect(getCorReserva("a")).toBe(getCorReserva("a"));
    expect(getCorReserva("a")).not.toBe(getCorReserva("b"));
    expect(getCorReserva("id-fora-da-lista")).toEqual(expect.any(String));
  });

  it("traduz erros conhecidos do backend em mensagens para o usuario", () => {
    expect(getMensagemErroReserva(new Error("booking_conflict"))).toBe("O equipamento já possui uma reserva nesse intervalo.");
    expect(getMensagemErroReserva(new Error("maintenance_conflict"))).toBe("O equipamento está em manutenção nesse intervalo.");
    expect(getMensagemErroReserva(new Error("incompatible_material"))).toBe("O material selecionado não é compatível com o equipamento.");
    expect(getMensagemErroReserva(new Error("material_required"))).toBe("Escolha o material da impressão.");
    expect(getMensagemErroReserva(new Error("equipment_unavailable"))).toBe("O equipamento selecionado não está ativo.");
    expect(getMensagemErroReserva(new Error("coordinator_required"))).toBe("Apenas o coordenador pode realizar essa operação.");
    expect(getMensagemErroReserva(new Error("booking_not_started"))).toBe("A reserva ainda não começou; aguarde o horário de início.");
    expect(getMensagemErroReserva(new Error("erro desconhecido"))).toBe("erro desconhecido");
    expect(getMensagemErroReserva("erro sem instancia")).toBe("erro sem instancia");
  });
});

describe("equipamentos", () => {
  const base = { id: "e", name: "E", model: null, location: null, status: "active" as const, notes: null, type_id: "t", asset_tag: null, created_at: "", updated_at: "" };

  it("só pede material para equipamento de tipo que usa material", () => {
    expect(equipmentUsesMaterial({ ...base, type: { id: "t", name: "Impressora 3D", uses_material: true, is_active: true } })).toBe(true);
    expect(equipmentUsesMaterial({ ...base, type: { id: "t", name: "Scanner 3D", uses_material: false, is_active: true } })).toBe(false);
    expect(equipmentUsesMaterial({ ...base, type: null })).toBe(false);
    expect(equipmentUsesMaterial(undefined)).toBe(false);
  });
});

describe("perfil e agenda", () => {
  it("traduz o papel do usuario", () => {
    expect(getRoleLabel("coordinator")).toBe("Coordenador");
    expect(getRoleLabel("researcher")).toBe("Pesquisador");
  });

  it("normaliza texto opcional removendo espacos e strings vazias", () => {
    expect(normalizarTextoOpcional("  Olá  ")).toBe("Olá");
    expect(normalizarTextoOpcional("   ")).toBeNull();
    expect(normalizarTextoOpcional("")).toBeNull();
  });

  it("normaliza CPF mantendo somente digitos", () => {
    expect(normalizarCpf("111.222.333-44")).toBe("11122233344");
    expect(normalizarCpf("   ")).toBeNull();
    expect(normalizarCpf("")).toBeNull();
  });

  it("valida URL do Lattes aceitando apenas http(s) ou vazio", () => {
    expect(validarLattes(null)).toBe(true);
    expect(validarLattes("https://lattes.cnpq.br/123")).toBe(true);
    expect(validarLattes("http://lattes.cnpq.br/123")).toBe(true);
    expect(validarLattes("ftp://lattes.cnpq.br/123")).toBe(false);
    expect(validarLattes("nao e uma url")).toBe(false);
  });

  it("traduz o modo de trabalho do slot de disponibilidade", () => {
    expect(getWorkModeLabel("onsite")).toBe("Presencial");
    expect(getWorkModeLabel("remote")).toBe("Home office");
    expect(getWorkModeLabel("aula")).toBe("Aula");
    expect(getWorkModeLabel(undefined)).toBe("-");
  });

  it("associa uma classe de cor a cada modo de trabalho", () => {
    expect(getSlotColorClassName("onsite")).toContain("success");
    expect(getSlotColorClassName("remote")).toContain("primary");
    expect(getSlotColorClassName("aula")).toContain("warning");
    expect(getSlotColorClassName(undefined)).toContain("border-border");
  });

  it("calcula a duracao em horas de um periodo cadastrado", () => {
    const periodos = [{ id: "manha", starts_at: "08:00", ends_at: "10:00" }];

    expect(getDuracaoPeriodoEmHoras("manha", periodos)).toBe(2);
    expect(getDuracaoPeriodoEmHoras("inexistente", periodos)).toBe(0);
  });

  it("abrevia o nome do dia da semana", () => {
    expect(getDiaAbreviado("Segunda")).toBe("Seg");
    expect(getDiaAbreviado("Sábado")).toBe("Sáb");
  });

  it("alterna a cor de fundo do dia par/impar na agenda", () => {
    expect(getCorDia(1)).toContain("sky");
    expect(getCorDia(2)).toContain("white");
  });

  it("escala a classe do contador de ocupacao conforme o total", () => {
    expect(getClasseContador(0)).toContain("border-border");
    expect(getClasseContador(3)).toContain("success");
    expect(getClasseContador(7)).toContain("warning");
    expect(getClasseContador(9)).toContain("danger");
  });

  it("compara slots de agenda pelo dia da semana e periodo", () => {
    expect(isSameSlot({ weekday: 1, periodo: "manha" }, { weekday: 1, periodo: "manha" })).toBe(true);
    expect(isSameSlot({ weekday: 1, periodo: "manha" }, { weekday: 1, periodo: "tarde" })).toBe(false);
    expect(isSameSlot({ weekday: 1, periodo: "manha" }, { weekday: 2, periodo: "manha" })).toBe(false);
  });
});
