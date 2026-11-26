import { describe, expect, it } from "vitest";

import { countPendingTasks, toLocalDate,
  filterProjects,
  emptyTaskFilters,
  filterTasks,
  getTaskPriorityLabel,
  getTaskPriorityVariant,
  hasActiveTaskFilters,
  taskPriorityOptions,
  getProjectColor,
  getTaskAssigneeOptions,
  formatProjectPeriod,
  getFundingTotal,
  getProjectErrorMessage,
  getProjectFundingTotal,
  getChecklistProgress,
  reorderTasks,
  groupTasksByStatus,
  isTaskOverdue,
  isProjectOpen,
  parseAmountInput,
  sortProjects,
  type Project,
  type ProjectTask,
} from "./projects";

function project(overrides: Partial<Project>): Project {
  return {
    id: "p",
    name: "Projeto",
    description: null,
    status: "active",
    starts_on: null,
    ends_on: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    members: [],
    funding: [],
    ...overrides,
  };
}

const funding = {
  agency_id: "a",
  agency_acronym: "FAPESP",
  process_number: null,
  grant_name: null,
  starts_on: null,
  ends_on: null,
  items: [
    { category: "capital" as const, description: null, amount: 1000.5 },
    { category: "custeio" as const, description: null, amount: 200 },
  ],
};

describe("valores de fomento", () => {
  it("soma as rubricas de um fomento e de todos os fomentos do projeto", () => {
    expect(getFundingTotal(funding)).toBe(1200.5);
    expect(getProjectFundingTotal(project({ funding: [funding, funding] }))).toBe(2401);
    expect(getProjectFundingTotal(project({}))).toBe(0);
  });

  it("interpreta valores com vírgula e rejeita negativos ou texto", () => {
    expect(parseAmountInput("1234.56")).toBe(1234.56);
    expect(parseAmountInput("1.234,56")).toBe(1234.56);
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("-5")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });
});

describe("lista de projetos", () => {
  const projects = [
    project({ id: "1", name: "Bio", status: "completed", funding: [funding] }),
    project({ id: "2", name: "Ótica", status: "active" }),
    project({ id: "3", name: "Aero", status: "active", funding: [funding] }),
  ];

  it("filtra por status, fomento e nome", () => {
    expect(filterProjects(projects, { status: "active", funding: "all", search: "" }).map((p) => p.id)).toEqual(["2", "3"]);
    expect(filterProjects(projects, { status: "all", funding: "funded", search: "" }).map((p) => p.id)).toEqual(["1", "3"]);
    expect(filterProjects(projects, { status: "all", funding: "unfunded", search: "" }).map((p) => p.id)).toEqual(["2"]);
    expect(filterProjects(projects, { status: "all", funding: "all", search: " aer" }).map((p) => p.id)).toEqual(["3"]);
  });

  it("ordena ativos primeiro e depois por nome", () => {
    expect(sortProjects(projects).map((p) => p.id)).toEqual(["3", "2", "1"]);
  });

  it("só aceita novas impressões em projetos abertos", () => {
    expect(isProjectOpen("active")).toBe(true);
    expect(isProjectOpen("paused")).toBe(true);
    expect(isProjectOpen("completed")).toBe(false);
    expect(isProjectOpen("archived")).toBe(false);
  });
});

describe("textos", () => {
  it("formata o período", () => {
    expect(formatProjectPeriod("2026-03-01", "2027-02-28")).toBe("01/03/2026 a 28/02/2027");
    expect(formatProjectPeriod("2026-03-01", null)).toBe("desde 01/03/2026");
    expect(formatProjectPeriod(null, null)).toBeNull();
  });

  it("traduz erros conhecidos do banco", () => {
    expect(getProjectErrorMessage(new Error('duplicate key value violates unique constraint "projects_name_key"'))).toBe(
      "Já existe um projeto com esse nome.",
    );
    expect(getProjectErrorMessage(new Error("coordinator_required"))).toContain("coordenadores");
  });
});

function task(overrides: Partial<ProjectTask>): ProjectTask {
  return {
    id: "t",
    project_id: "p",
    project_name: null,
    title: "Tarefa",
    description: null,
    status: "todo",
    priority: "normal",
    position: 0,
    due_on: null,
    created_by: "u",
    assignees: [],
    archived_at: null,
    checklist: [],
    created_at: "2026-01-01T00:00:00Z",
    completed_at: null,
    work_seconds: 0,
    review_seconds: 0,
    running: [],
    ...overrides,
  };
}

describe("tarefas do kanban", () => {
  const tasks = [
    task({ id: "1", title: "B", status: "todo", position: 2 }),
    task({ id: "2", title: "A", status: "todo", position: 1 }),
    task({ id: "3", title: "C", status: "done", position: 5 }),
  ];

  it("agrupa por coluna e ordena por posição", () => {
    const groups = groupTasksByStatus(tasks);
    expect(groups.todo.map((t) => t.id)).toEqual(["2", "1"]);
    expect(groups.done.map((t) => t.id)).toEqual(["3"]);
    expect(groups.review).toEqual([]);
  });

  it("reordena dentro da coluna e renumera", () => {
    const result = reorderTasks(tasks, "1", "todo", "2");
    expect(groupTasksByStatus(result).todo.map((t) => t.id)).toEqual(["1", "2"]);
    expect(groupTasksByStatus(result).todo.map((t) => t.position)).toEqual([1, 2]);
  });

  it("move para o fim de outra coluna e para antes de um cartão", () => {
    const toDone = reorderTasks(tasks, "1", "done", null);
    expect(groupTasksByStatus(toDone).done.map((t) => t.id)).toEqual(["3", "1"]);
    expect(groupTasksByStatus(toDone).todo.map((t) => t.id)).toEqual(["2"]);
    const beforeThree = reorderTasks(tasks, "1", "done", "3");
    expect(groupTasksByStatus(beforeThree).done.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("ordena a coluna com cartões de projetos diferentes", () => {
    const mixed = [
      task({ id: "a", project_id: "p1", status: "todo", position: 1 }),
      task({ id: "b", project_id: "p2", status: "todo", position: 2 }),
      task({ id: "c", project_id: "p1", status: "todo", position: 3 }),
    ];
    const result = reorderTasks(mixed, "c", "todo", "a");
    expect(groupTasksByStatus(result).todo.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("calcula o progresso da checklist", () => {
    expect(getChecklistProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
    expect(getChecklistProgress([{ done: true }, { done: false }, { done: true }])).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("marca como atrasada só tarefa não concluída com prazo vencido", () => {
    expect(isTaskOverdue(task({ due_on: "2026-05-01" }), "2026-05-02")).toBe(true);
    expect(isTaskOverdue(task({ due_on: "2026-05-02" }), "2026-05-02")).toBe(false);
    expect(isTaskOverdue(task({ due_on: "2026-05-01", status: "done" }), "2026-05-02")).toBe(false);
    expect(isTaskOverdue(task({ due_on: null }), "2026-05-02")).toBe(false);
  });
});

describe("quadro geral de tarefas", () => {
  const ana = { profile_id: "ana", full_name: "Ana", avatar_url: null };
  const bia = { profile_id: "bia", full_name: "Bia", avatar_url: null };
  const tasks = [
    task({ id: "1", project_id: "p1", assignees: [ana], due_on: "2026-05-01" }),
    task({ id: "2", project_id: "p1", assignees: [ana, bia] }),
    task({ id: "3", project_id: "p2", assignees: [bia], due_on: "2026-05-01", status: "done" }),
    task({ id: "4", project_id: "p2", assignees: [] }),
  ];
  const all = emptyTaskFilters;
  const ids = (list: ProjectTask[]) => list.map((t) => t.id);

  it("filtra por prioridade", () => {
    const withPriority = [
      task({ id: "u", priority: "urgent" }),
      task({ id: "n", priority: "normal" }),
      task({ id: "l", priority: "low" }),
    ];
    expect(ids(filterTasks(withPriority, { ...all, priority: "urgent" }, "ana", "2026-05-02"))).toEqual(["u"]);
    expect(ids(filterTasks(withPriority, { ...all, priority: "low" }, "ana", "2026-05-02"))).toEqual(["l"]);
    expect(ids(filterTasks(withPriority, all, "ana", "2026-05-02"))).toEqual(["u", "n", "l"]);
  });

  it("tem quatro prioridades, da mais para a menos importante, e filtra pela Alta", () => {
    expect(taskPriorityOptions.map((option) => option.value)).toEqual(["urgent", "high", "normal", "low"]);
    expect(getTaskPriorityVariant("high")).toBe("warning");
    expect(getTaskPriorityLabel("high")).not.toBe("high");
    const withHigh = [task({ id: "h", priority: "high" }), task({ id: "n", priority: "normal" })];
    expect(ids(filterTasks(withHigh, { ...all, priority: "high" }, "ana", "2026-05-02"))).toEqual(["h"]);
  });

  it("esconde as tarefas arquivadas, a menos que se peça para mostrá-las", () => {
    const list = [task({ id: "a" }), task({ id: "b", archived_at: "2026-05-01T10:00:00Z" })];
    expect(ids(filterTasks(list, all, "ana", "2026-05-02"))).toEqual(["a"]);
    expect(ids(filterTasks(list, { ...all, showArchived: true }, "ana", "2026-05-02"))).toEqual(["a", "b"]);
    expect(hasActiveTaskFilters(all)).toBe(false);
    expect(hasActiveTaskFilters({ ...all, showArchived: true })).toBe(true);
    expect(hasActiveTaskFilters({ ...all, overdueOnly: true })).toBe(true);
  });

  it("filtra por projeto, responsável e atrasadas", () => {
    expect(ids(filterTasks(tasks, all, "ana", "2026-05-02"))).toEqual(["1", "2", "3", "4"]);
    expect(ids(filterTasks(tasks, { ...all, projectId: "p2" }, "ana", "2026-05-02"))).toEqual(["3", "4"]);
    expect(ids(filterTasks(tasks, { ...all, assignee: "me" }, "ana", "2026-05-02"))).toEqual(["1", "2"]);
    expect(ids(filterTasks(tasks, { ...all, assignee: "bia" }, "ana", "2026-05-02"))).toEqual(["2", "3"]);
    expect(ids(filterTasks(tasks, { ...all, overdueOnly: true }, "ana", "2026-05-02"))).toEqual(["1"]);
  });

  it("o filtro 'eu' não devolve nada sem pessoa logada", () => {
    expect(filterTasks(tasks, { ...all, assignee: "me" }, null, "2026-05-02")).toEqual([]);
  });

  it("lista os responsáveis sem repetir e em ordem", () => {
    expect(getTaskAssigneeOptions(tasks).map((a) => a.full_name)).toEqual(["Ana", "Bia"]);
  });

  it("gera a mesma cor para o mesmo projeto e cores diferentes entre projetos", () => {
    expect(getProjectColor("abc")).toEqual(getProjectColor("abc"));
    expect(getProjectColor("abc").background).not.toBe(getProjectColor("xyz").background);
  });
});

describe("tarefas pendentes na campainha", () => {
  it("conta as urgentes, as atrasadas e as de hoje, cada uma uma vez, só de projetos em aberto", () => {
    const tasks = [
      { due_on: "2026-11-20", priority: "normal" as const, project_status: "active" as const },
      { due_on: "2026-11-26", priority: "high" as const, project_status: "paused" as const },
      { due_on: "2026-11-27", priority: "high" as const, project_status: "active" as const },
      { due_on: null, priority: "urgent" as const, project_status: "active" as const },
      { due_on: "2026-12-10", priority: "urgent" as const, project_status: "planning" as const },
      { due_on: "2026-11-01", priority: "urgent" as const, project_status: "active" as const },
      { due_on: null, priority: "normal" as const, project_status: "active" as const },
      { due_on: null, priority: "urgent" as const, project_status: "completed" as const },
    ];
    expect(countPendingTasks(tasks, "2026-11-26")).toEqual({ total: 5, urgent: 3, overdue: 2 });
  });

  it("formata a data local como a do banco", () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
