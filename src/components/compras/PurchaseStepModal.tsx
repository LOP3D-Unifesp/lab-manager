import { useT } from "../../i18n";
import { FormEvent, useState } from "react";

import { formatCurrencyBRL } from "../../lib/projects";
import { getPurchaseErrorMessage, formatMoneyField, parseMaskedMoney, type PurchaseRequest } from "../../lib/purchases";
import { MoneyInput } from "../ui/MoneyInput";
import { setPurchaseStatus } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { inputClassName } from "../ui/formStyles";

type PurchaseStepModalProps = {
  mode: "reject" | "purchase";
  purchase: PurchaseRequest;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

// Recusar (com motivo) ou marcar como comprado (com o valor pago).
export function PurchaseStepModal({ mode, onClose, onDone, purchase }: PurchaseStepModalProps) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(formatMoneyField(purchase.estimated_amount));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let actualAmount: number | null = null;
    if (mode === "purchase") {
      actualAmount = parseMaskedMoney(amount);
      if (actualAmount === null) {
        setErro(t("purchases.errPaid"));
        return;
      }
    }
    try {
      setSalvando(true);
      setErro("");
      await setPurchaseStatus({
        requestId: purchase.id,
        status: mode === "reject" ? "rejected" : "purchased",
        reason: mode === "reject" ? reason : null,
        actualAmount,
      });
      await onDone();
    } catch (error) {
      setErro(getPurchaseErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={mode === "reject" ? t("purchases.stepReject") : t("purchases.markPurchased")}
      description={`${purchase.item} · ${purchase.project_id === null ? t("purchases.generalStockLab") : purchase.project_name}`}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={confirmar}>
        {mode === "reject" ? (
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("purchases.reasonOptional")}
            <textarea
              autoFocus
              className={`${inputClassName} min-h-24 py-3`}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="text-sm font-normal text-muted">{t("purchases.reasonHint")}</span>
          </label>
        ) : (
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("purchases.totalPaid")}
            <MoneyInput autoFocus className={inputClassName} value={amount} onChange={setAmount} />
            <span className="text-sm font-normal text-muted">{t("purchases.estimatedInRequest", { amount: formatCurrencyBRL(purchase.estimated_amount) })}</span>
          </label>
        )}
        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("common.back")}
          </Button>
          <Button type="submit" variant={mode === "reject" ? "danger" : "success"} disabled={salvando}>
            {salvando ? t("common.saving") : mode === "reject" ? t("purchases.stepReject") : t("purchases.confirmPurchase")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
