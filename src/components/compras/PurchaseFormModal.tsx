import { useT } from "../../i18n";
import { FormEvent, useState } from "react";

import { formatCurrencyBRL } from "../../lib/projects";
import { MoneyInput } from "../ui/MoneyInput";
import { createPurchaseRequest, updatePurchaseRequest } from "../../lib/supabaseRepository";
import type { Project } from "../../lib/projects";
import {
  buildMaintenancePurchaseNote,
  GENERAL_STOCK_VALUE,
  getPurchaseErrorMessage,
  calculateTotal,
  formatMoneyField,
  getUnitAmountForEdit,
  parseMaskedMoney,
  purchaseCategoryOptions,
  purchaseUrgencyOptions,
  validatePurchaseForm,
  type PurchaseRequest,
  type PurchaseUrgency,
} from "../../lib/purchases";
import type { FundingCategory } from "../../lib/projects";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { inputClassName } from "../ui/formStyles";

type PurchaseFormModalProps = {
  /** Pedido de peça feito a partir de um chamado de manutenção: já vem preenchido e fica ligado ao chamado. */
  fromMaintenance?: { requestId: string; equipmentName: string; description: string; urgency: PurchaseUrgency };
  projects: Project[];
  purchase: PurchaseRequest | null; // null = novo pedido
  defaultProjectId: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

export function PurchaseFormModal({ defaultProjectId, fromMaintenance, onClose, onDone, projects, purchase }: PurchaseFormModalProps) {
  const t = useT();
  const [projectId, setProjectId] = useState(purchase ? (purchase.project_id ?? GENERAL_STOCK_VALUE) : defaultProjectId);
  const [category, setCategory] = useState<string>(purchase?.funding_category ?? (fromMaintenance ? "custeio" : ""));
  const [urgency, setUrgency] = useState<PurchaseUrgency>(purchase?.urgency ?? fromMaintenance?.urgency ?? "normal");
  const linkedToRequest = Boolean(fromMaintenance || purchase?.maintenance_request_id);
  const [forMaintenance, setForMaintenance] = useState(linkedToRequest || (purchase?.for_maintenance ?? false));
  const [item, setItem] = useState(purchase?.item ?? "");
  const [url, setUrl] = useState(purchase?.url ?? "");
  const [quantity, setQuantity] = useState(String(purchase?.quantity ?? 1));
  const [amount, setAmount] = useState(purchase ? formatMoneyField(getUnitAmountForEdit(purchase.estimated_amount, purchase.quantity)) : "");
  const [notes, setNotes] = useState(purchase?.notes ?? (fromMaintenance ? buildMaintenancePurchaseNote(fromMaintenance.equipmentName, fromMaintenance.description) : ""));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const unitValue = parseMaskedMoney(amount);
  const quantityValue = Number(quantity);
  const previewTotal = unitValue !== null && Number.isInteger(quantityValue) && quantityValue >= 1 ? calculateTotal(unitValue, quantityValue) : null;

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validatePurchaseForm({ projectId, category, urgency, item, url, quantity, amount, notes });
    if (invalid) {
      setErro(invalid);
      return;
    }
    const input = {
      item,
      url: url.trim() || null,
      quantity: Number(quantity),
      estimatedAmount: calculateTotal(parseMaskedMoney(amount) as number, Number(quantity)),
      notes: notes.trim() || null,
      fundingCategory: category as FundingCategory,
      urgency,
      forMaintenance: linkedToRequest || forMaintenance,
    };
    try {
      setSalvando(true);
      setErro("");
      if (purchase) {
        const original = purchase.project_id ?? GENERAL_STOCK_VALUE;
        await updatePurchaseRequest(purchase.id, {
          ...input,
          ...(projectId !== original ? { projectId: projectId === GENERAL_STOCK_VALUE ? null : projectId } : {}),
        });
      }
      else await createPurchaseRequest({ ...input, projectId: projectId === GENERAL_STOCK_VALUE ? null : projectId, maintenanceRequestId: fromMaintenance?.requestId ?? null });
      await onDone();
    } catch (error) {
      setErro(getPurchaseErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={purchase ? t("purchases.formEdit") : fromMaintenance ? t("purchases.formPart", { name: fromMaintenance.equipmentName }) : t("purchases.formNew")}
      description={fromMaintenance ? t("purchases.formHintLinked") : t("purchases.formHint")}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={salvar}>
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("purchases.forWhom")}
          <select
            className={inputClassName}
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="" disabled>
              {t("purchases.select")}
            </option>
            <option value={GENERAL_STOCK_VALUE}>{t("purchases.generalStockLab")}</option>
            {purchase?.project_id && !projects.some((project) => project.id === purchase.project_id) ? (
              <option value={purchase.project_id}>{purchase.project_name}</option>
            ) : null}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && !purchase ? (
            <span className="text-sm font-normal text-muted">{t("purchases.noOpenProject")}</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("purchases.category")}
          <select className={inputClassName} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="" disabled>
              {t("purchases.select")}
            </option>
            {purchaseCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("purchases.item")}
          <input autoFocus className={inputClassName} maxLength={200} value={item} onChange={(event) => setItem(event.target.value)} />
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("purchases.link")}
          <input
            className={inputClassName}
            inputMode="url"
            placeholder="https://"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("purchases.quantity")}
            <input className={inputClassName} inputMode="numeric" maxLength={6} value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("purchases.unitValue")}
            <MoneyInput
              className={inputClassName}
              placeholder="0,00"
              value={amount}
              onChange={setAmount}
            />
          </label>
        </div>
        {previewTotal !== null ? (
          <p className="-mt-2 text-sm text-muted">
            {t("purchases.totalEstimated")} <strong className="text-text">{formatCurrencyBRL(previewTotal)}</strong>
            {Number(quantity) > 1 ? ` (${quantity} × ${formatCurrencyBRL(parseMaskedMoney(amount) as number)})` : ""}
          </p>
        ) : null}
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("purchases.notes")}
          <textarea
            className={`${inputClassName} min-h-20 py-3`}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 text-base font-semibold text-text">
          <input
            checked={linkedToRequest || forMaintenance}
            className="mt-1 h-4 w-4 accent-primary"
            disabled={linkedToRequest}
            type="checkbox"
            onChange={(event) => setForMaintenance(event.target.checked)}
          />
          <span>
            {t("purchases.maintenanceSpend")}
            <span className="block text-sm font-normal text-muted">
              {linkedToRequest ? t("purchases.linkedToTicket") : t("purchases.maintenanceHint")}
            </span>
          </span>
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-base font-semibold text-text">{t("purchases.urgency")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {purchaseUrgencyOptions.map((option) => (
              <label
                key={option.value}
                className={[
                  "grid cursor-pointer gap-1 rounded-lg border p-3 transition",
                  urgency === option.value ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary",
                ].join(" ")}
              >
                <span className="flex items-center gap-2 text-base font-semibold text-text">
                  <input
                    checked={urgency === option.value}
                    className="h-4 w-4 accent-primary"
                    name="urgencia-compra"
                    type="radio"
                    onChange={() => setUrgency(option.value)}
                  />
                  {option.label}
                </span>
                <span className="text-sm text-muted">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? t("common.saving") : purchase ? t("purchases.saveChanges") : t("purchases.send")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
