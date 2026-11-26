import { getLocale, t } from "../i18n";
import type { StatusVariant } from "../components/ui/StatusBadge";
import { fundingCategoryOptions, type FundingCategory } from "./projects";

// Rubricas em que uma compra pode se enquadrar (bolsas não são compra).
export const purchaseCategoryOptions = fundingCategoryOptions.filter((option) => option.value !== "bolsas");

export function getPurchaseCategoryLabel(category: FundingCategory | null) {
  return category ? (fundingCategoryOptions.find((option) => option.value === category)?.label ?? category) : t("funding.noCategory");
}

// Pedido sem projeto: compra para o estoque geral do laboratório (a mesma ideia do Inventário).
export const GENERAL_STOCK_VALUE = "general";
export const GENERAL_STOCK_LABEL = "Estoque geral do laboratório";
// Nome interno do grupo "sem equipamento" nos gastos de manutenção (a tela traduz na exibição).
export const NO_EQUIPMENT_NAME = "Sem equipamento definido";

export type PurchaseUrgency = "low" | "normal" | "urgent";

export const purchaseUrgencyOptions: Array<{ value: PurchaseUrgency; label: string; hint: string }> = [
  { value: "low", get label() { return t("opt.purchaseUrgencyOptions.low"); }, get hint() { return t("opt.purchaseUrgencyOptions.low.hint"); } },
  { value: "normal", get label() { return t("opt.purchaseUrgencyOptions.normal"); }, get hint() { return t("opt.purchaseUrgencyOptions.normal.hint"); } },
  { value: "urgent", get label() { return t("opt.purchaseUrgencyOptions.urgent"); }, get hint() { return t("opt.purchaseUrgencyOptions.urgent.hint"); } },
];

export function getPurchaseUrgencyLabel(urgency: PurchaseUrgency) {
  return purchaseUrgencyOptions.find((option) => option.value === urgency)?.label ?? urgency;
}

export function getPurchaseUrgencyVariant(urgency: PurchaseUrgency): StatusVariant {
  if (urgency === "urgent") return "danger";
  if (urgency === "low") return "neutral";
  return "info";
}

export type PurchaseStatus = "requested" | "approved" | "rejected" | "purchased" | "delivered" | "cancelled";

export const purchaseStatusOptions: Array<{ value: PurchaseStatus; label: string }> = [
  { value: "requested", get label() { return t("opt.purchaseStatusOptions.requested"); } },
  { value: "approved", get label() { return t("opt.purchaseStatusOptions.approved"); } },
  { value: "purchased", get label() { return t("opt.purchaseStatusOptions.purchased"); } },
  { value: "delivered", get label() { return t("opt.purchaseStatusOptions.delivered"); } },
  { value: "rejected", get label() { return t("opt.purchaseStatusOptions.rejected"); } },
  { value: "cancelled", get label() { return t("opt.purchaseStatusOptions.cancelled"); } },
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
  /** Nulo quando o pedido é para o estoque geral. */
  project_id: string | null;
  project_name: string;
  requested_by: string | null;
  requested_by_name: string | null;
  item: string;
  url: string | null;
  quantity: number;
  estimated_amount: number;
  urgency: PurchaseUrgency;
  funding_category: FundingCategory | null;
  notes: string | null;
  status: PurchaseStatus;
  decided_by_name: string | null;
  /** Chamado de manutenção que originou o pedido (uma peça de que a máquina precisa), se houver. */
  maintenance_request_id: string | null;
  /** Equipamento a que se destina o gasto de manutenção (o do chamado, quando há um). */
  equipment_id: string | null;
  maintenance_equipment_name: string | null;
  /** Gasto de manutenção (peças, reparos), independente da rubrica. */
  for_maintenance: boolean;
  decided_at: string | null;
  rejected_reason: string | null;
  actual_amount: number | null;
  purchased_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

// Peça pedida a partir de um chamado: o que o chamado precisa saber do pedido.
export type MaintenancePurchase = {
  id: string;
  maintenance_request_id: string;
  item: string;
  quantity: number;
  status: PurchaseStatus;
};

// Texto das observações de um pedido feito a partir de um chamado (limitado para caber nas observações).
export function buildMaintenancePurchaseNote(equipmentName: string, description: string) {
  const text = description.trim().replace(/\s+/g, " ");
  return `Para o chamado de manutenção em ${equipmentName}: ${text.length > 300 ? `${text.slice(0, 297)}...` : text}`;
}

// Pedidos que ainda estão andando (não chegaram a um estado final).
export function isPurchaseOpen(status: PurchaseStatus) {
  return status === "requested" || status === "approved" || status === "purchased";
}

export type PurchaseFilters = {
  status: "open" | "all" | PurchaseStatus;
  projectId: string; // "all", "general" (estoque geral) ou id do projeto
  category: "all" | FundingCategory;
  urgency: "all" | PurchaseUrgency;
  kind: "all" | "maintenance" | "other";
  mine: boolean;
};

export function filterPurchases(purchases: PurchaseRequest[], filters: PurchaseFilters, profileId: string | null) {
  return purchases.filter((purchase) => {
    if (filters.status === "open" && !isPurchaseOpen(purchase.status)) return false;
    if (filters.status !== "open" && filters.status !== "all" && purchase.status !== filters.status) return false;
    if (filters.projectId === GENERAL_STOCK_VALUE) {
      if (purchase.project_id !== null) return false;
    } else if (filters.projectId !== "all" && purchase.project_id !== filters.projectId) return false;
    if (filters.category !== "all" && purchase.funding_category !== filters.category) return false;
    if (filters.urgency !== "all" && purchase.urgency !== filters.urgency) return false;
    if (filters.kind === "maintenance" && !purchase.for_maintenance) return false;
    if (filters.kind === "other" && purchase.for_maintenance) return false;
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

const URGENCY_RANK: Record<PurchaseUrgency, number> = { urgent: 0, normal: 1, low: 2 };

// Quem precisa de decisão primeiro; dentro da mesma etapa, os urgentes e depois os mais antigos.
// Encerrados por último, os mais recentes antes.
export function sortPurchases(purchases: PurchaseRequest[]) {
  return [...purchases].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (!isPurchaseOpen(a.status)) return -delta;
    return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || delta;
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
  if (status === "approved") return { status: "requested", label: t("purchases.undoApproved"), warning: null };
  if (status === "purchased") return { status: "approved", label: t("purchases.undoPurchased"), warning: t("purchases.undoPurchasedWarning") };
  if (status === "delivered") return { status: "purchased", label: t("purchases.undoDelivered"), warning: null };
  if (status === "rejected" || status === "cancelled") return { status: "requested", label: t("purchases.reopen"), warning: null };
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
    const key = purchase.project_id ?? GENERAL_STOCK_VALUE;
    const current = map.get(key) ?? {
      projectId: key,
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
    map.set(key, current);
  }
  return [...map.values()].sort((a, b) => a.projectName.localeCompare(b.projectName, getLocale()));
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
  if (update.status === "approved") return { title: t("purchases.notifApprovedTitle"), body: t("purchases.notifApprovedBody", { item }) };
  if (update.status === "rejected") {
    return {
      title: t("purchases.notifRejectedTitle"),
      body: update.rejected_reason ? t("purchases.notifRejectedReason", { item, reason: update.rejected_reason }) : t("purchases.notifRejectedBody", { item }),
    };
  }
  if (update.status === "purchased") return { title: t("purchases.notifPurchasedTitle"), body: t("purchases.notifPurchasedBody", { item }) };
  return { title: t("purchases.notifDeliveredTitle"), body: t("purchases.notifDeliveredBody", { item }) };
}

export type MaintenanceSpending = {
  estimated: number;
  paid: number;
  count: number;
  byEquipment: Array<{ name: string; estimated: number; paid: number; count: number }>;
};

// Quanto se gasta com manutenção: o previsto (pedidos ainda não comprados) e o pago (comprados e entregues),
// no total e por equipamento (quando o pedido veio de um chamado). Recusados e cancelados ficam de fora.
export function summarizeMaintenanceSpending(purchases: PurchaseRequest[]): MaintenanceSpending {
  const total: MaintenanceSpending = { estimated: 0, paid: 0, count: 0, byEquipment: [] };
  const groups = new Map<string, MaintenanceSpending["byEquipment"][number]>();
  for (const purchase of purchases) {
    if (!purchase.for_maintenance || purchase.status === "rejected" || purchase.status === "cancelled") continue;
    const paid = purchase.status === "purchased" || purchase.status === "delivered";
    const value = paid ? (purchase.actual_amount ?? purchase.estimated_amount) : purchase.estimated_amount;
    const name = purchase.maintenance_equipment_name ?? NO_EQUIPMENT_NAME;
    const group = groups.get(name) ?? { name, estimated: 0, paid: 0, count: 0 };
    if (paid) {
      total.paid += value;
      group.paid += value;
    } else {
      total.estimated += value;
      group.estimated += value;
    }
    total.count += 1;
    group.count += 1;
    groups.set(name, group);
  }
  total.byEquipment = [...groups.values()].sort((a, b) => b.paid + b.estimated - (a.paid + a.estimated) || a.name.localeCompare(b.name, getLocale()));
  return total;
}

export function isValidPurchaseUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && value.trim().length <= 2000;
  } catch {
    return false;
  }
}

// "1.234,56", "1234,5" e "1234.56" viram número; texto inválido vira null. `decimals` limita as casas
// decimais (2 para valores pagos; o valor unitário aceita até 4, para totais que não dividem certinho).
export function parseMoney(text: string, decimals = 2): number | null {
  const cleaned = text.trim().replace(/^R\$\s*/i, "");
  if (!cleaned) return null;
  const normalized = /,/.test(cleaned) ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(normalized)) return null;
  return Number(normalized);
}

// Máscara de dinheiro dos campos de valor: os centavos ficam sempre à vista e cada dígito digitado entra pela
// direita ("1" vira "0,01", "150" vira "1,50", "15059" vira "150,59"), com ponto de milhar. Campo vazio fica vazio.
// Ao colar um valor completo ("1.234,56", "1234.56") ou um inteiro ("1234" vira "1.234,00"), ele é respeitado.
export function formatCents(cents: number) {
  const digits = String(Math.max(0, Math.round(cents))).padStart(3, "0");
  const integer = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${integer},${digits.slice(-2)}`;
}

// Valor numérico (em reais) para o texto do campo, por exemplo 1234.5 vira "1.234,50".
export function formatMoneyField(value: number) {
  return formatCents(Math.round((value + Number.EPSILON) * 100));
}

export function maskCentsInput(raw: string, pasted = false) {
  if (pasted) {
    const text = raw.trim().replace(/^R\$\s*/i, "");
    const decimal = text.match(/^(\d[\d.]*)[.,](\d{1,2})$/);
    if (decimal) return formatCents(Number(decimal[1].replace(/\./g, "").slice(0, 9) + decimal[2].padEnd(2, "0")));
    if (/^\d[\d.]*$/.test(text)) return formatCents(Number(text.replace(/\./g, "").slice(0, 9)) * 100);
  }
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  return digits === "" ? "" : formatCents(Number(digits));
}

// Lê o texto de um campo com a máscara acima: o ponto é sempre separador de milhar e a vírgula, a decimal.
export function parseMaskedMoney(text: string, decimals = 2): number | null {
  const normalized = text.trim().replace(/^R\$\s*/i, "").replace(/\./g, "").replace(",", ".").replace(/\.$/, "");
  if (!normalized) return null;
  if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(normalized)) return null;
  return Number(normalized);
}

const roundCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// O pedido guarda o total; o formulário pede o valor de uma unidade e multiplica pela quantidade.
export function calculateTotal(unitAmount: number, quantity: number) {
  return roundCents(unitAmount * quantity);
}

// Valor unitário para preencher o formulário ao editar (arredondado em centavos). Um pedido antigo cujo total não
// divide certinho pela quantidade pode mudar 1 centavo ao ser salvo; o total novo aparece antes de salvar.
export function getUnitAmountForEdit(total: number, quantity: number) {
  return roundCents(total / Math.max(quantity, 1));
}

// Valor unitário para exibir ao lado do total, só quando ele fecha certinho (2 casas) com a quantidade.
export function getUnitAmount(total: number, quantity: number): number | null {
  if (quantity <= 1) return null;
  const unit = roundCents(total / quantity);
  return Math.abs(unit * quantity - total) < 0.005 ? unit : null;
}

export type PurchaseFormValues = { projectId: string; category: string; urgency: string; item: string; url: string; quantity: string; amount: string; notes: string };

export function validatePurchaseForm(values: PurchaseFormValues) {
  if (!values.projectId) return t("purchaseError.chooseProject");
  if (!purchaseCategoryOptions.some((option) => option.value === values.category)) return t("purchaseError.chooseCategory");
  if (!purchaseUrgencyOptions.some((option) => option.value === values.urgency)) return t("purchaseError.chooseUrgency");
  const item = values.item.trim();
  if (item.length < 2 || item.length > 200) return t("purchaseError.itemLength");
  if (values.url.trim() && !isValidPurchaseUrl(values.url)) return t("purchaseError.link");
  const quantity = Number(values.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) return t("purchaseError.quantity");
  const unit = parseMaskedMoney(values.amount);
  if (unit === null) return t("purchaseError.unitValue");
  if (calculateTotal(unit, quantity) >= 100_000_000) return t("purchaseError.tooHigh");
  if (values.notes.length > 1000) return t("purchaseError.notesLength");
  return null;
}

export function getPurchaseErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("coordinator_required")) return t("purchaseError.coordinator_required");
  if (text.includes("invalid_purchase_transition")) return t("purchaseError.invalid_purchase_transition");
  if (text.includes("purchase_not_editable")) return t("purchaseError.purchase_not_editable");
  if (text.includes("purchase_not_found")) return t("purchaseError.purchase_not_found");
  if (text.includes("project_not_available")) return t("purchaseError.project_not_available");
  if (text.includes("purchase_forbidden")) return t("purchaseError.purchase_forbidden");
  if (text.includes("purchase_requests_url_check")) return t("purchaseError.link");
  if (text.includes("row-level security")) return t("purchaseError.rls");
  return text || t("purchaseError.fallback");
}
