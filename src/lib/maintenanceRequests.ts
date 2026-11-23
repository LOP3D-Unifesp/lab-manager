import type { StatusVariant } from "../components/ui/StatusBadge";

export type MaintenanceUrgency = "low" | "normal" | "urgent";

export const maintenanceUrgencyOptions: Array<{ value: MaintenanceUrgency; label: string; hint: string }> = [
  { value: "low", label: "Baixa", hint: "Pode esperar" },
  { value: "normal", label: "Normal", hint: "Atrapalha, mas dá para usar" },
  { value: "urgent", label: "Urgente", hint: "Parou ou é perigoso" },
];

export function getMaintenanceUrgencyLabel(urgency: MaintenanceUrgency) {
  return maintenanceUrgencyOptions.find((option) => option.value === urgency)?.label ?? urgency;
}

export function getMaintenanceUrgencyVariant(urgency: MaintenanceUrgency): StatusVariant {
  if (urgency === "urgent") return "danger";
  if (urgency === "low") return "neutral";
  return "info";
}

export type MaintenanceRequestStatus = "open" | "in_progress" | "waiting_part" | "resolved" | "cancelled";

export const maintenanceRequestStatusOptions: Array<{ value: MaintenanceRequestStatus; label: string }> = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting_part", label: "Aguardando peça" },
  { value: "resolved", label: "Resolvido" },
  { value: "cancelled", label: "Cancelado" },
];

export function getMaintenanceRequestStatusLabel(status: MaintenanceRequestStatus) {
  return maintenanceRequestStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getMaintenanceRequestStatusVariant(status: MaintenanceRequestStatus): StatusVariant {
  if (status === "open") return "warning";
  if (status === "in_progress" || status === "waiting_part") return "info";
  if (status === "resolved") return "success";
  return "neutral";
}

export type MaintenanceRequest = {
  id: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type_id: string | null;
  description: string;
  urgency: MaintenanceUrgency;
  status: MaintenanceRequestStatus;
  requested_by: string | null;
  requested_by_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  photo_paths: string[];
  created_at: string;
};

// Ainda pede atenção (aberto, em andamento ou aguardando peça).
export function isRequestActive(status: MaintenanceRequestStatus) {
  return status === "open" || status === "in_progress" || status === "waiting_part";
}

export type RequestFilters = {
  typeId: string; // "all" ou id do tipo de equipamento
  equipmentId: string; // "all" ou id
  status: MaintenanceRequestStatus | "active" | "all";
  mine: boolean;
};

export function filterRequests(requests: MaintenanceRequest[], filters: RequestFilters, profileId: string | null) {
  return requests.filter((request) => {
    if (filters.typeId !== "all" && request.equipment_type_id !== filters.typeId) return false;
    if (filters.equipmentId !== "all" && request.equipment_id !== filters.equipmentId) return false;
    if (filters.status === "active" && !isRequestActive(request.status)) return false;
    if (filters.status !== "active" && filters.status !== "all" && request.status !== filters.status) return false;
    if (filters.mine && request.requested_by !== profileId && request.assigned_to !== profileId) return false;
    return true;
  });
}

const URGENCY_RANK: Record<MaintenanceUrgency, number> = { urgent: 0, normal: 1, low: 2 };

// Abertos antes dos em andamento e dos que aguardam peça; entre iguais, mais urgentes e mais antigos primeiro.
// Encerrados por último.
export function sortRequests(requests: MaintenanceRequest[]) {
  const group = (request: MaintenanceRequest) =>
    request.status === "open" ? 0 : request.status === "in_progress" ? 1 : request.status === "waiting_part" ? 2 : 3;
  return [...requests].sort(
    (a, b) =>
      group(a) - group(b) ||
      (group(a) < 3
        ? URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );
}

// Para o Dashboard: o que a pessoa precisa atender (responsáveis: chamados abertos ou em andamento com ela)
// e o que ela mesma abriu e segue ativo. Um chamado nunca aparece nos dois grupos.
export type RequestSort = "priority" | "newest" | "oldest" | "equipment" | "status";

export const requestSortOptions: Array<{ value: RequestSort; label: string }> = [
  { value: "priority", label: "Prioridade (padrão)" },
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "equipment", label: "Equipamento (A–Z)" },
  { value: "status", label: "Situação" },
];

export function isRequestSort(value: unknown): value is RequestSort {
  return requestSortOptions.some((option) => option.value === value);
}

const STATUS_RANK: Record<MaintenanceRequestStatus, number> = { open: 0, in_progress: 1, waiting_part: 2, resolved: 3, cancelled: 4 };

const timeOf = (request: MaintenanceRequest) => new Date(request.created_at).getTime();

// Ordem da lista de chamados. "Prioridade" é a de sempre (abertos antes dos em andamento, urgentes e mais antigos
// primeiro, encerrados por último); as demais ordenam só pelo critério escolhido, com a data como desempate.
export function orderRequests(requests: MaintenanceRequest[], sort: RequestSort) {
  if (sort === "priority") return sortRequests(requests);
  const list = [...requests];
  if (sort === "newest") return list.sort((a, b) => timeOf(b) - timeOf(a));
  if (sort === "oldest") return list.sort((a, b) => timeOf(a) - timeOf(b));
  if (sort === "equipment") {
    return list.sort((a, b) => a.equipment_name.localeCompare(b.equipment_name, "pt-BR") || timeOf(b) - timeOf(a));
  }
  return list.sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || timeOf(a) - timeOf(b),
  );
}

export function getMyRequestGroups(requests: MaintenanceRequest[], profileId: string, canMaintainNow: boolean) {
  const active = requests.filter((request) => isRequestActive(request.status));
  const toHandle = canMaintainNow
    ? sortRequests(
        active.filter(
          (request) => request.status === "open" || request.assigned_to === profileId || (request.status === "waiting_part" && request.assigned_to === null),
        ),
      )
    : [];
  const handled = new Set(toHandle.map((request) => request.id));
  const mine = sortRequests(active.filter((request) => request.requested_by === profileId && !handled.has(request.id)));
  return { toHandle, mine };
}

export function countOpenRequests(requests: MaintenanceRequest[], equipmentId: string) {
  return requests.filter((request) => request.equipment_id === equipmentId && isRequestActive(request.status)).length;
}

export type RequestActions = {
  take: boolean;
  resolve: boolean;
  giveBack: boolean;
  cancel: boolean;
  reopen: boolean;
  /** Marcar como aguardando peça (de em andamento). */
  waitPart: boolean;
  /** Retomar a manutenção (de aguardando peça). */
  resume: boolean;
};

// O que cada pessoa pode fazer com um chamado: responsáveis e coordenação tratam; quem abriu só cancela enquanto aberto.
export function getRequestActions(request: MaintenanceRequest, profileId: string | null, canMaintainNow: boolean): RequestActions {
  const none: RequestActions = { take: false, resolve: false, giveBack: false, cancel: false, reopen: false, waitPart: false, resume: false };
  if (request.status === "cancelled") return none;
  if (canMaintainNow) {
    return {
      take: request.status === "open",
      resolve: isRequestActive(request.status),
      giveBack: request.status === "in_progress" || request.status === "waiting_part",
      cancel: isRequestActive(request.status),
      reopen: request.status === "resolved",
      waitPart: request.status === "in_progress",
      resume: request.status === "waiting_part",
    };
  }
  return { ...none, cancel: request.status === "open" && request.requested_by === profileId };
}

export function validateRequestDescription(text: string) {
  const length = text.trim().length;
  if (length < 3) return "Descreva o problema com pelo menos 3 caracteres.";
  if (length > 2000) return "A descrição pode ter até 2000 caracteres.";
  return null;
}

export function getRequestErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("maintainer_required")) return "Apenas coordenadores e responsáveis pela manutenção podem fazer essa alteração.";
  if (text.includes("invalid_request_transition")) return "Esse chamado não pode mais mudar de situação.";
  if (text.includes("invalid_assignee")) return "O responsável precisa ser coordenador ou responsável pela manutenção.";
  if (text.includes("request_not_found")) return "Chamado não encontrado.";
  if (text.includes("maintenance_requests_description_check")) return "A descrição precisa ter entre 3 e 2000 caracteres.";
  if (text.includes("row-level security")) return "Você não tem permissão para fazer essa alteração.";
  return text || "Não foi possível concluir a operação.";
}
