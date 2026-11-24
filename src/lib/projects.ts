import { getLocale, t } from "../i18n";
import type { StatusVariant } from "../components/ui/StatusBadge";

export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "archived";

export const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", get label() { return t("opt.projectStatusOptions.planning"); } },
  { value: "active", get label() { return t("opt.projectStatusOptions.active"); } },
  { value: "paused", get label() { return t("opt.projectStatusOptions.paused"); } },
  { value: "completed", get label() { return t("opt.projectStatusOptions.completed"); } },
  { value: "archived", get label() { return t("opt.projectStatusOptions.archived"); } },
];

export function getProjectStatusLabel(status: ProjectStatus) {
  return projectStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getProjectStatusVariant(status: ProjectStatus): StatusVariant {
  if (status === "active") return "success";
  if (status === "planning") return "info";
  if (status === "paused") return "warning";
  return "neutral";
}

// Projetos concluídos ou arquivados não recebem novas impressões.
export function isProjectOpen(status: ProjectStatus) {
  return status === "planning" || status === "active" || status === "paused";
}

export type FundingCategory = "capital" | "custeio" | "bolsas" | "passagens" | "diarias" | "reserva_tecnica" | "outros";

export const fundingCategoryOptions: Array<{ value: FundingCategory; label: string; hint: string }> = [
  { value: "capital", get label() { return t("opt.fundingCategoryOptions.capital"); }, get hint() { return t("opt.fundingCategoryOptions.capital.hint"); } },
  { value: "custeio", get label() { return t("opt.fundingCategoryOptions.custeio"); }, get hint() { return t("opt.fundingCategoryOptions.custeio.hint"); } },
  { value: "bolsas", get label() { return t("opt.fundingCategoryOptions.bolsas"); }, get hint() { return t("opt.fundingCategoryOptions.bolsas.hint"); } },
  { value: "passagens", get label() { return t("opt.fundingCategoryOptions.passagens"); }, get hint() { return t("opt.fundingCategoryOptions.passagens.hint"); } },
  { value: "diarias", get label() { return t("opt.fundingCategoryOptions.diarias"); }, get hint() { return t("opt.fundingCategoryOptions.diarias.hint"); } },
  { value: "reserva_tecnica", get label() { return t("opt.fundingCategoryOptions.reserva_tecnica"); }, get hint() { return t("opt.fundingCategoryOptions.reserva_tecnica.hint"); } },
  { value: "outros", get label() { return t("opt.fundingCategoryOptions.outros"); }, get hint() { return t("opt.fundingCategoryOptions.outros.hint"); } },
];

export function getFundingCategoryLabel(category: FundingCategory) {
  return fundingCategoryOptions.find((option) => option.value === category)?.label ?? category;
}

export type FundingAgencyRecord = {
  id: string;
  acronym: string;
  name: string | null;
  is_active: boolean;
};

export type ProjectFundingItem = {
  category: FundingCategory;
  description: string | null;
  amount: number;
};

export type ProjectFunding = {
  agency_id: string;
  agency_acronym: string;
  process_number: string | null;
  grant_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  items: ProjectFundingItem[];
};

export type ProjectMember = {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  funding: ProjectFunding[];
};

export function getFundingTotal(funding: Pick<ProjectFunding, "items">) {
  return funding.items.reduce((total, item) => total + item.amount, 0);
}

export function getProjectFundingTotal(project: Pick<Project, "funding">) {
  return project.funding.reduce((total, funding) => total + getFundingTotal(funding), 0);
}

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat(getLocale(), { style: "currency", currency: "BRL" }).format(value);
}

// Aceita "1234.56" (campo numérico) e "1.234,56" (digitado à mão). Retorna null se inválido.
export function parseAmountInput(value: string) {
  const text = value.trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function formatProjectDate(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  if (!(year && month && day)) return value;
  return new Intl.DateTimeFormat(getLocale(), { timeZone: "UTC" }).format(new Date(`${year}-${month}-${day}T00:00:00Z`));
}

export function formatProjectPeriod(startsOn: string | null, endsOn: string | null) {
  const start = formatProjectDate(startsOn);
  const end = formatProjectDate(endsOn);
  if (start && end) return `${start} a ${end}`;
  if (start) return `desde ${start}`;
  if (end) return `até ${end}`;
  return null;
}

export type ProjectFundingFilter = "all" | "funded" | "unfunded";

export function filterProjects(
  projects: Project[],
  filters: { status: ProjectStatus | "all"; funding: ProjectFundingFilter; search: string },
) {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((project) => {
    if (filters.status !== "all" && project.status !== filters.status) return false;
    if (filters.funding === "funded" && project.funding.length === 0) return false;
    if (filters.funding === "unfunded" && project.funding.length > 0) return false;
    return !search || project.name.toLowerCase().includes(search);
  });
}

export function sortProjects(projects: Project[]) {
  const order: Record<ProjectStatus, number> = {
    active: 0,
    planning: 1,
    paused: 2,
    completed: 3,
    archived: 4,
  };
  return [...projects].sort(
    (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, getLocale()),
  );
}

export function getProjectErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("projects_name_key")) return t("projectError.projects_name_key");
  if (text.includes("funding_agencies_acronym_key")) return t("projectError.funding_agencies_acronym_key");
  if (text.includes("coordinator_required")) return t("projectError.coordinator_required");
  if (text.includes("project_not_found")) return t("projectError.project_not_found");
  if (text.includes("invalid_project_members")) return t("projectError.invalid_project_members");
  if (text.includes("invalid_funding")) return t("projectError.invalid_funding");
  if (text.includes("projects_dates_check") || text.includes("project_funding_dates_check")) {
    return t("projectError.dates");
  }
  return text || t("projectError.fallback");
}

// ---------------------------------------------------------------------------
// Tarefas (kanban)
// ---------------------------------------------------------------------------

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export const taskStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "todo", get label() { return t("opt.taskStatusOptions.todo"); } },
  { value: "in_progress", get label() { return t("opt.taskStatusOptions.in_progress"); } },
  { value: "review", get label() { return t("opt.taskStatusOptions.review"); } },
  { value: "done", get label() { return t("opt.taskStatusOptions.done"); } },
];

export function getTaskStatusLabel(status: TaskStatus) {
  return taskStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export type ProjectTask = {
  id: string;
  project_id: string;
  project_name: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  due_on: string | null;
  created_by: string;
  assignees: ProjectMember[];
};

export function groupTasksByStatus(tasks: ProjectTask[]) {
  const groups: Record<TaskStatus, ProjectTask[]> = { todo: [], in_progress: [], review: [], done: [] };
  for (const task of tasks) groups[task.status].push(task);
  for (const status of Object.keys(groups) as TaskStatus[]) {
    groups[status].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, getLocale()));
  }
  return groups;
}

// Posição para o card entrar no fim de uma coluna.
export function getNextTaskPosition(tasks: ProjectTask[], status: TaskStatus) {
  return tasks.reduce((max, task) => (task.status === status ? Math.max(max, task.position) : max), 0) + 1;
}

// `today` no formato AAAA-MM-DD; tarefa concluída nunca está atrasada.
export function isTaskOverdue(task: Pick<ProjectTask, "due_on" | "status">, today: string) {
  return task.status !== "done" && task.due_on !== null && task.due_on < today;
}

export function getTaskErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("assignee_must_be_project_member")) return t("taskError.assignee_must_be_project_member");
  if (text.includes("project_access_required")) return t("taskError.project_access_required");
  if (text.includes("task_not_found")) return t("taskError.task_not_found");
  if (text.includes("project_tasks_title_check")) return t("taskError.title_check");
  if (text.includes("row-level security")) return t("taskError.rls");
  return getProjectErrorMessage(error);
}

// ---------------------------------------------------------------------------
// Quadro geral de tarefas
// ---------------------------------------------------------------------------

// Cor estável por projeto (derivada do id) para o chip nos cards do quadro geral.
export function getProjectColor(projectId: string) {
  let hash = 0;
  for (let i = 0; i < projectId.length; i += 1) hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return {
    background: `hsl(${hue} 70% 92%)`,
    color: `hsl(${hue} 60% 24%)`,
    border: `hsl(${hue} 50% 70%)`,
  };
}

export type TaskFilters = {
  projectId: string; // "all" ou id do projeto
  assignee: string; // "all", "me" ou id da pessoa
  overdueOnly: boolean;
};

// `today` no formato AAAA-MM-DD.
export function filterTasks(tasks: ProjectTask[], filters: TaskFilters, meId: string | null, today: string) {
  return tasks.filter((task) => {
    if (filters.projectId !== "all" && task.project_id !== filters.projectId) return false;
    if (filters.assignee !== "all") {
      const wanted = filters.assignee === "me" ? meId : filters.assignee;
      if (!wanted || !task.assignees.some((assignee) => assignee.profile_id === wanted)) return false;
    }
    return !filters.overdueOnly || isTaskOverdue(task, today);
  });
}

// Pessoas que aparecem como responsáveis em alguma tarefa, para o filtro do quadro.
export function getTaskAssigneeOptions(tasks: ProjectTask[]) {
  const byId = new Map<string, string>();
  for (const task of tasks) for (const assignee of task.assignees) byId.set(assignee.profile_id, assignee.full_name);
  return [...byId.entries()]
    .map(([profile_id, full_name]) => ({ profile_id, full_name }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, getLocale()));
}
