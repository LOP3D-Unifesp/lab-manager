import type { StatusVariant } from "../components/ui/StatusBadge";

export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "archived";

export const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: "planning", label: "Planejamento" },
  { value: "active", label: "Em andamento" },
  { value: "paused", label: "Pausado" },
  { value: "completed", label: "Concluído" },
  { value: "archived", label: "Arquivado" },
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

export type FundingCategory = "capital" | "custeio" | "bolsas" | "reserva_tecnica" | "outros";

export const fundingCategoryOptions: Array<{ value: FundingCategory; label: string; hint: string }> = [
  { value: "capital", label: "Capital", hint: "Equipamentos e material permanente" },
  { value: "custeio", label: "Custeio", hint: "Material de consumo e serviços" },
  { value: "bolsas", label: "Bolsas", hint: "Bolsas de estudo e pesquisa" },
  { value: "reserva_tecnica", label: "Reserva técnica", hint: "Reserva técnica e benefício institucional" },
  { value: "outros", label: "Outros", hint: "Demais rubricas" },
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
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
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
  return year && month && day ? `${day}/${month}/${year}` : value;
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
    (a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "pt-BR"),
  );
}

export function getProjectErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("projects_name_key")) return "Já existe um projeto com esse nome.";
  if (text.includes("funding_agencies_acronym_key")) return "Já existe uma agência com essa sigla.";
  if (text.includes("coordinator_required")) return "Apenas coordenadores podem fazer essa alteração.";
  if (text.includes("project_not_found")) return "Projeto não encontrado.";
  if (text.includes("invalid_project_members")) return "A lista de membros contém uma pessoa inativa ou inexistente.";
  if (text.includes("invalid_funding")) return "Revise os dados de fomento (agência, datas e valores).";
  if (text.includes("projects_dates_check") || text.includes("project_funding_dates_check")) {
    return "A data final não pode ser anterior à inicial.";
  }
  return text || "Não foi possível concluir a operação.";
}
