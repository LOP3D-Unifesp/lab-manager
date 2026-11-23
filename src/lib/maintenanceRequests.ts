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

export type MaintenanceRequestStatus = "open" | "in_progress" | "resolved" | "cancelled";

export const maintenanceRequestStatusOptions: Array<{ value: MaintenanceRequestStatus; label: string }> = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "cancelled", label: "Cancelado" },
];

export function getMaintenanceRequestStatusLabel(status: MaintenanceRequestStatus) {
  return maintenanceRequestStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getMaintenanceRequestStatusVariant(status: MaintenanceRequestStatus): StatusVariant {
  if (status === "open") return "warning";
  if (status === "in_progress") return "info";
  if (status === "resolved") return "success";
  return "neutral";
}

export type MaintenanceRequest = {
  id: string;
  equipment_id: string;
  equipment_name: string;
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

// Ainda pede atenção (aberto ou em andamento).
export function isRequestActive(status: MaintenanceRequestStatus) {
  return status === "open" || status === "in_progress";
}

export type RequestFilters = {
  equipmentId: string; // "all" ou id
  status: MaintenanceRequestStatus | "active" | "all";
  mine: boolean;
};

export function filterRequests(requests: MaintenanceRequest[], filters: RequestFilters, profileId: string | null) {
  return requests.filter((request) => {
    if (filters.equipmentId !== "all" && request.equipment_id !== filters.equipmentId) return false;
    if (filters.status === "active" && !isRequestActive(request.status)) return false;
    if (filters.status !== "active" && filters.status !== "all" && request.status !== filters.status) return false;
    if (filters.mine && request.requested_by !== profileId && request.assigned_to !== profileId) return false;
    return true;
  });
}

const URGENCY_RANK: Record<MaintenanceUrgency, number> = { urgent: 0, normal: 1, low: 2 };

// Abertos antes dos em andamento; entre iguais, mais urgentes e mais antigos primeiro. Encerrados por último.
export function sortRequests(requests: MaintenanceRequest[]) {
  const group = (request: MaintenanceRequest) =>
    request.status === "open" ? 0 : request.status === "in_progress" ? 1 : 2;
  return [...requests].sort(
    (a, b) =>
      group(a) - group(b) ||
      (group(a) < 2
        ? URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  );
}

export function countOpenRequests(requests: MaintenanceRequest[], equipmentId: string) {
  return requests.filter((request) => request.equipment_id === equipmentId && isRequestActive(request.status)).length;
}

export type RequestActions = { take: boolean; resolve: boolean; giveBack: boolean; cancel: boolean; reopen: boolean };

// O que cada pessoa pode fazer com um chamado: responsáveis e coordenação tratam; quem abriu só cancela enquanto aberto.
export function getRequestActions(request: MaintenanceRequest, profileId: string | null, canMaintainNow: boolean): RequestActions {
  const none: RequestActions = { take: false, resolve: false, giveBack: false, cancel: false, reopen: false };
  if (request.status === "cancelled") return none;
  if (canMaintainNow) {
    return {
      take: request.status === "open",
      resolve: request.status === "open" || request.status === "in_progress",
      giveBack: request.status === "in_progress",
      cancel: request.status === "open" || request.status === "in_progress",
      reopen: request.status === "resolved",
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
