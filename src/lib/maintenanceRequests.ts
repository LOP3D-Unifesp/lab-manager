import { getLocale, t } from "../i18n";
import type { StatusVariant } from "../components/ui/StatusBadge";

export type MaintenanceUrgency = "low" | "normal" | "urgent";

export const maintenanceUrgencyOptions: Array<{ value: MaintenanceUrgency; label: string; hint: string }> = [
  { value: "low", get label() { return t("opt.maintenanceUrgencyOptions.low"); }, get hint() { return t("opt.maintenanceUrgencyOptions.low.hint"); } },
  { value: "normal", get label() { return t("opt.maintenanceUrgencyOptions.normal"); }, get hint() { return t("opt.maintenanceUrgencyOptions.normal.hint"); } },
  { value: "urgent", get label() { return t("opt.maintenanceUrgencyOptions.urgent"); }, get hint() { return t("opt.maintenanceUrgencyOptions.urgent.hint"); } },
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
  { value: "open", get label() { return t("opt.maintenanceRequestStatusOptions.open"); } },
  { value: "in_progress", get label() { return t("opt.maintenanceRequestStatusOptions.in_progress"); } },
  { value: "waiting_part", get label() { return t("opt.maintenanceRequestStatusOptions.waiting_part"); } },
  { value: "resolved", get label() { return t("opt.maintenanceRequestStatusOptions.resolved"); } },
  { value: "cancelled", get label() { return t("opt.maintenanceRequestStatusOptions.cancelled"); } },
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

export type RequestSort = "priority" | "newest" | "oldest" | "equipment" | "status";

export const requestSortOptions: Array<{ value: RequestSort; label: string }> = [
  { value: "priority", get label() { return t("requestSort.priority"); } },
  { value: "newest", get label() { return t("requestSort.newest"); } },
  { value: "oldest", get label() { return t("requestSort.oldest"); } },
  { value: "equipment", get label() { return t("requestSort.equipment"); } },
  { value: "status", get label() { return t("requestSort.status"); } },
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
    return list.sort((a, b) => a.equipment_name.localeCompare(b.equipment_name, getLocale()) || timeOf(b) - timeOf(a));
  }
  return list.sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || timeOf(a) - timeOf(b),
  );
}

// Para o Dashboard: o que a pessoa precisa atender (o que está com ela e, para quem cuida da manutenção, os abertos e
// os que aguardam peça sem encarregado), o que ela mesma abriu e segue ativo e, só para quem cuida da manutenção, os
// demais ativos (com outras pessoas). Um chamado nunca aparece em dois grupos. "Cuida da manutenção" é a marcação
// no cadastro: um coordenador sem ela acompanha pela contagem de abertos.
export function getMyRequestGroups(requests: MaintenanceRequest[], profileId: string, maintains: boolean) {
  const active = requests.filter((request) => isRequestActive(request.status));
  const toHandle = sortRequests(
    active.filter(
      (request) =>
        request.assigned_to === profileId ||
        (maintains && (request.status === "open" || (request.status === "waiting_part" && request.assigned_to === null))),
    ),
  );
  const handled = new Set(toHandle.map((request) => request.id));
  const mine = sortRequests(active.filter((request) => request.requested_by === profileId && !handled.has(request.id)));
  const own = new Set(mine.map((request) => request.id));
  const others = maintains ? sortRequests(active.filter((request) => !handled.has(request.id) && !own.has(request.id))) : [];
  return { toHandle, mine, others };
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
  if (length < 3) return t("requestError.tooShort");
  if (length > 2000) return t("requestError.tooLong");
  return null;
}

export function getRequestErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("maintainer_required")) return t("requestError.maintainer_required");
  if (text.includes("invalid_request_transition")) return t("requestError.invalid_request_transition");
  if (text.includes("invalid_assignee")) return t("requestError.invalid_assignee");
  if (text.includes("request_not_found")) return t("requestError.request_not_found");
  if (text.includes("maintenance_requests_description_check")) return t("requestError.description_check");
  if (text.includes("row-level security")) return t("requestError.rls");
  return text || t("requestError.fallback");
}
