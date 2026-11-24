import { getLocale, t } from "../i18n";
import type { StatusVariant } from "../components/ui/StatusBadge";

export type MaterialCategory = "filament" | "resin" | "powder" | "other";
export type MaterialUnit = "g" | "ml";

export const materialCategoryOptions: Array<{ value: MaterialCategory; label: string; defaultUnit: MaterialUnit }> = [
  { value: "filament", get label() { return t("opt.materialCategoryOptions.filament"); }, defaultUnit: "g" },
  { value: "resin", get label() { return t("opt.materialCategoryOptions.resin"); }, defaultUnit: "ml" },
  { value: "powder", get label() { return t("opt.materialCategoryOptions.powder"); }, defaultUnit: "g" },
  { value: "other", get label() { return t("opt.materialCategoryOptions.other"); }, defaultUnit: "g" },
];

export function getMaterialCategoryLabel(category: MaterialCategory) {
  return materialCategoryOptions.find((option) => option.value === category)?.label ?? category;
}

export type CatalogMaterial = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  category: MaterialCategory;
  unit: MaterialUnit;
};

export type SpoolStatus = "sealed" | "in_use" | "empty" | "discarded";

export const spoolStatusOptions: Array<{ value: SpoolStatus; label: string }> = [
  { value: "sealed", get label() { return t("opt.spoolStatusOptions.sealed"); } },
  { value: "in_use", get label() { return t("opt.spoolStatusOptions.in_use"); } },
  { value: "empty", get label() { return t("opt.spoolStatusOptions.empty"); } },
  { value: "discarded", get label() { return t("opt.spoolStatusOptions.discarded"); } },
];

export function getSpoolStatusLabel(status: SpoolStatus) {
  return spoolStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getSpoolStatusVariant(status: SpoolStatus): StatusVariant {
  if (status === "sealed") return "info";
  if (status === "in_use") return "success";
  if (status === "empty") return "warning";
  return "neutral";
}

export type MaterialSpool = {
  id: string;
  material_id: string;
  material_name: string;
  unit: MaterialUnit;
  color_name: string;
  color_hex: string | null;
  manufacturer: string | null;
  diameter_mm: number | null;
  lot_number: string | null;
  initial_amount: number;
  current_amount: number;
  status: SpoolStatus;
  project_id: string | null;
  project_name: string | null;
  storage_location: string | null;
  opened_on: string | null;
  last_dried_on: string | null;
  notes: string | null;
};

// Rolo que ainda pode ser escolhido numa reserva.
export function isSpoolUsable(spool: Pick<MaterialSpool, "status" | "current_amount">) {
  return (spool.status === "sealed" || spool.status === "in_use") && spool.current_amount > 0;
}

export function getSpoolRemainingPercent(spool: Pick<MaterialSpool, "current_amount" | "initial_amount">) {
  if (spool.initial_amount <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((spool.current_amount / spool.initial_amount) * 100)));
}

export const LOW_STOCK_PERCENT = 20;

// "Pouco restante": rolo utilizável com até 20% do peso inicial.
export function isSpoolLow(spool: Pick<MaterialSpool, "status" | "current_amount" | "initial_amount">) {
  return isSpoolUsable(spool) && getSpoolRemainingPercent(spool) <= LOW_STOCK_PERCENT;
}

export function formatAmount(value: number, unit: MaterialUnit) {
  const text = new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(value);
  return `${text} ${unit}`;
}

export function getSpoolLabel(spool: MaterialSpool) {
  const parts = [spool.color_name, spool.manufacturer, formatAmount(spool.current_amount, spool.unit)];
  return parts.filter(Boolean).join(" · ");
}

export type SpoolFilters = {
  search: string;
  materialId: string; // "all" ou id
  projectId: string; // "all", "general" ou id
  status: "available" | "all" | SpoolStatus;
  lowOnly: boolean;
};

export function filterSpools(spools: MaterialSpool[], filters: SpoolFilters) {
  const search = filters.search.trim().toLowerCase();
  return spools.filter((spool) => {
    if (filters.materialId !== "all" && spool.material_id !== filters.materialId) return false;
    if (filters.projectId === "general" && spool.project_id !== null) return false;
    if (filters.projectId !== "all" && filters.projectId !== "general" && spool.project_id !== filters.projectId) return false;
    if (filters.status === "available" && !isSpoolUsable(spool)) return false;
    if (filters.status !== "available" && filters.status !== "all" && spool.status !== filters.status) return false;
    if (filters.lowOnly && !isSpoolLow(spool)) return false;
    if (!search) return true;
    return [spool.material_name, spool.color_name, spool.manufacturer, spool.lot_number, spool.storage_location]
      .filter(Boolean)
      .some((value) => (value as string).toLowerCase().includes(search));
  });
}

// Rolos que a reserva pode usar: do material escolhido, do projeto ou do estoque geral, com saldo.
// Os do projeto vêm primeiro; depois os que têm menos sobra (gasta-se o que já está aberto).
// `keepSpoolId` mantém o rolo atual ao editar uma reserva, mesmo que já não seja utilizável.
export function getSpoolsForBooking(
  spools: MaterialSpool[],
  materialId: string,
  projectId: string,
  keepSpoolId: string | null = null,
) {
  return spools
    .filter(
      (spool) =>
        spool.material_id === materialId &&
        (spool.project_id === null || spool.project_id === projectId) &&
        (isSpoolUsable(spool) || spool.id === keepSpoolId),
    )
    .sort((a, b) => {
      // O rolo mantido que já não serve (vazio) fica por último.
      const aUnusable = isSpoolUsable(a) ? 0 : 1;
      const bUnusable = isSpoolUsable(b) ? 0 : 1;
      if (aUnusable !== bUnusable) return aUnusable - bUnusable;
      const aProject = a.project_id === null ? 1 : 0;
      const bProject = b.project_id === null ? 1 : 0;
      return aProject - bProject || a.current_amount - b.current_amount;
    });
}

export function parseAmount(value: string) {
  const text = value.trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getInventoryErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("materials_name_key")) return t("inventoryError.materials_name_key");
  if (text.includes("material_spools_current_amount_check")) return t("inventoryError.current_amount_check");
  if (text.includes("material_spools_initial_amount_check")) return t("inventoryError.initial_amount_check");
  if (text.includes("material_spools_color_hex_check")) return t("inventoryError.color_hex_check");
  if (text.includes("spool_not_available")) return t("inventoryError.spool_not_available");
  if (text.includes("usage_not_allowed")) return t("inventoryError.usage_not_allowed");
  if (text.includes("booking_without_spool")) return t("inventoryError.booking_without_spool");
  if (text.includes("invalid_amount")) return t("inventoryError.invalid_amount");
  if (text.includes("row-level security") || text.includes("permission denied")) return t("inventoryError.permission");
  return text || t("inventoryError.fallback");
}
