import type { StatusVariant } from "../components/ui/StatusBadge";
import { fundingCategoryOptions, type FundingCategory } from "./projects";

// Rubricas em que uma compra pode se enquadrar (bolsas não são compra).
export const purchaseCategoryOptions = fundingCategoryOptions.filter((option) => option.value !== "bolsas");

export function getPurchaseCategoryLabel(category: FundingCategory | null) {
  return category ? (fundingCategoryOptions.find((option) => option.value === category)?.label ?? category) : "Sem rubrica";
}

export type PurchaseStatus = "requested" | "approved" | "rejected" | "purchased" | "delivered" | "cancelled";

export const purchaseStatusOptions: Array<{ value: PurchaseStatus; label: string }> = [
  { value: "requested", label: "Solicitado" },
  { value: "approved", label: "Aprovado" },
  { value: "purchased", label: "Comprado" },
  { value: "delivered", label: "Entregue" },
  { value: "rejected", label: "Recusado" },
  { value: "cancelled", label: "Cancelado" },
];

export function getPurchaseStatusLabel(status: PurchaseStatus) {
  return purchaseStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getPurchaseStatusVariant(status: PurchaseStatus): StatusVariant {
  if (status === "requested") return "warning";
  if (status === "approved" || status === "purchased") return "info";
  if (status === "delivered") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

export type PurchaseRequest = {
  id: string;
  project_id: string;
  project_name: string;
  requested_by: string | null;
  requested_by_name: string | null;
  item: string;
  url: string | null;
  quantity: number;
  estimated_amount: number;
  funding_category: FundingCategory | null;
  notes: string | null;
  status: PurchaseStatus;
  decided_by_name: string | null;
  decided_at: string | null;
  rejected_reason: string | null;
  actual_amount: number | null;
  purchased_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

// Pedidos que ainda estão andando (não chegaram a um estado final).
export function isPurchaseOpen(status: PurchaseStatus) {
  return status === "requested" || status === "approved" || status === "purchased";
}

export type PurchaseFilters = {
  status: "open" | "all" | PurchaseStatus;
  projectId: string; // "all" ou id
  category: "all" | FundingCategory;
  mine: boolean;
};

export function filterPurchases(purchases: PurchaseRequest[], filters: PurchaseFilters, profileId: string | null) {
  return purchases.filter((purchase) => {
    if (filters.status === "open" && !isPurchaseOpen(purchase.status)) return false;
    if (filters.status !== "open" && filters.status !== "all" && purchase.status !== filters.status) return false;
    if (filters.projectId !== "all" && purchase.project_id !== filters.projectId) return false;
    if (filters.category !== "all" && purchase.funding_category !== filters.category) return false;
    if (filters.mine && purchase.requested_by !== profileId) return false;
    return true;
  });
}

const STATUS_ORDER: Record<PurchaseStatus, number> = {
  requested: 0,
  approved: 1,
  purchased: 2,
  delivered: 3,
  rejected: 4,
  cancelled: 5,
};

// Quem precisa de decisão primeiro (mais antigos antes); encerrados por último, os mais recentes antes.
export function sortPurchases(purchases: PurchaseRequest[]) {
  return [...purchases].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return isPurchaseOpen(a.status) ? delta : -delta;
  });
}

export type PurchaseUndo = { status: PurchaseStatus; label: string; warning: string | null };

export type PurchaseActions = {
  edit: boolean;
  cancel: boolean;
  approve: boolean;
  reject: boolean;
  purchase: boolean;
  deliver: boolean;
  undo: PurchaseUndo | null;
};

// Só o coordenador volta uma etapa, para corrigir um engano; o que a etapa gravou é apagado.
export function getPurchaseUndo(status: PurchaseStatus): PurchaseUndo | null {
  if (status === "approved") return { status: "requested", label: "Voltar para solicitado", warning: null };
  if (status === "purchased") return { status: "approved", label: "Desfazer compra", warning: "O valor pago e a data da compra serão apagados." };
  if (status === "delivered") return { status: "purchased", label: "Desfazer entrega", warning: null };
  if (status === "rejected" || status === "cancelled") return { status: "requested", label: "Reabrir pedido", warning: null };
  return null;
}

// O coordenador decide e acompanha até a entrega; quem pediu só edita e cancela enquanto ninguém decidiu.
export function getPurchaseActions(purchase: PurchaseRequest, profileId: string | null, isCoordinator: boolean): PurchaseActions {
  const isAuthor = purchase.requested_by !== null && purchase.requested_by === profileId;
  const waiting = purchase.status === "requested";
  return {
    edit: waiting && (isAuthor || isCoordinator),
    cancel: (waiting && (isAuthor || isCoordinator)) || (isCoordinator && purchase.status === "approved"),
    approve: isCoordinator && waiting,
    reject: isCoordinator && waiting,
    purchase: isCoordinator && purchase.status === "approved",
    deliver: isCoordinator && purchase.status === "purchased",
    undo: isCoordinator ? getPurchaseUndo(purchase.status) : null,
  };
}

export type ProjectPurchaseTotals = { projectId: string; projectName: string; estimated: number; paid: number; count: number };

// Por projeto: o que está previsto (pedidos que seguem valendo) e o que já foi pago (comprados e entregues).
export function summarizeByProject(purchases: PurchaseRequest[]): ProjectPurchaseTotals[] {
  const map = new Map<string, ProjectPurchaseTotals>();
  for (const purchase of purchases) {
    if (purchase.status === "rejected" || purchase.status === "cancelled") continue;
    const current = map.get(purchase.project_id) ?? {
      projectId: purchase.project_id,
      projectName: purchase.project_name,
      estimated: 0,
      paid: 0,
      count: 0,
    };
    current.count += 1;
    if (purchase.status === "purchased" || purchase.status === "delivered") {
      current.paid += purchase.actual_amount ?? purchase.estimated_amount;
    } else {
      current.estimated += purchase.estimated_amount;
    }
    map.set(purchase.project_id, current);
  }
  return [...map.values()].sort((a, b) => a.projectName.localeCompare(b.projectName, "pt-BR"));
}

// Novidades de um pedido para quem o fez: só as etapas decididas pelo coordenador.
export type PurchaseUpdate = {
  id: string;
  item: string;
  status: PurchaseStatus;
  rejected_reason: string | null;
  updated_at: string;
};

export const NOTIFIABLE_PURCHASE_STATUSES: PurchaseStatus[] = ["approved", "rejected", "purchased", "delivered"];

export function isNotifiablePurchaseStatus(status: string): status is PurchaseStatus {
  return NOTIFIABLE_PURCHASE_STATUSES.includes(status as PurchaseStatus);
}

export function describePurchaseUpdate(update: Pick<PurchaseUpdate, "item" | "status" | "rejected_reason">) {
  const item = `“${update.item}”`;
  if (update.status === "approved") return { title: "Pedido aprovado", body: `${item} foi aprovado.` };
  if (update.status === "rejected") {
    return { title: "Pedido recusado", body: update.rejected_reason ? `${item} foi recusado: ${update.rejected_reason}` : `${item} foi recusado.` };
  }
  if (update.status === "purchased") return { title: "Pedido comprado", body: `${item} foi comprado.` };
  return { title: "Pedido entregue", body: `${item} foi entregue.` };
}

// Quantas novidades chegaram depois da última vez que a pessoa olhou.
export function countUnseenPurchaseUpdates(updates: PurchaseUpdate[], seenAt: string | null) {
  if (!seenAt) return 0;
  const seen = new Date(seenAt).getTime();
  return updates.filter((update) => new Date(update.updated_at).getTime() > seen).length;
}

export function isValidPurchaseUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && value.trim().length <= 2000;
  } catch {
    return false;
  }
}

// "1.234,56", "1234,5" e "1234.56" viram número; texto inválido vira null.
export function parseMoney(text: string): number | null {
  const cleaned = text.trim().replace(/^R\$\s*/i, "");
  if (!cleaned) return null;
  const normalized = /,/.test(cleaned) ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

export type PurchaseFormValues = { projectId: string; category: string; item: string; url: string; quantity: string; amount: string; notes: string };

export function validatePurchaseForm(values: PurchaseFormValues) {
  if (!values.projectId) return "Escolha o projeto.";
  if (!purchaseCategoryOptions.some((option) => option.value === values.category)) return "Escolha a rubrica do item.";
  const item = values.item.trim();
  if (item.length < 2 || item.length > 200) return "Descreva o item (de 2 a 200 caracteres).";
  if (values.url.trim() && !isValidPurchaseUrl(values.url)) return "O link precisa começar com http:// ou https://.";
  const quantity = Number(values.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return "A quantidade precisa ser um número inteiro maior que zero.";
  const amount = parseMoney(values.amount);
  if (amount === null) return "Informe o valor estimado, por exemplo 129,90.";
  if (amount >= 100_000_000) return "Valor alto demais.";
  if (values.notes.length > 1000) return "As observações podem ter até 1000 caracteres.";
  return null;
}

export function getPurchaseErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("coordinator_required")) return "Apenas o coordenador pode fazer essa alteração.";
  if (text.includes("invalid_purchase_transition")) return "Esse pedido não pode mudar para essa situação.";
  if (text.includes("purchase_not_editable")) return "O pedido já foi decidido e não pode mais ser editado.";
  if (text.includes("purchase_not_found")) return "Pedido não encontrado.";
  if (text.includes("purchase_forbidden")) return "Só quem pediu (ou o coordenador) pode editar este pedido.";
  if (text.includes("purchase_requests_url_check")) return "O link precisa começar com http:// ou https://.";
  if (text.includes("row-level security")) return "Você não pode pedir compras para esse projeto (ele precisa estar em aberto e você ser membro).";
  return text || "Não foi possível concluir a operação.";
}
