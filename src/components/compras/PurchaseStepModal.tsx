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
        setErro("Informe o valor pago, por exemplo 129,90.");
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
      title={mode === "reject" ? "Recusar pedido" : "Marcar como comprado"}
      description={`${purchase.item} · ${purchase.project_name}`}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={confirmar}>
        {mode === "reject" ? (
          <label className="grid gap-2 text-base font-semibold text-text">
            Motivo (opcional)
            <textarea
              autoFocus
              className={`${inputClassName} min-h-24 py-3`}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <span className="text-sm font-normal text-muted">Quem pediu vê o motivo no pedido.</span>
          </label>
        ) : (
          <label className="grid gap-2 text-base font-semibold text-text">
            Valor total pago (R$)
            <MoneyInput autoFocus className={inputClassName} value={amount} onChange={setAmount} />
            <span className="text-sm font-normal text-muted">Total estimado no pedido: {formatCurrencyBRL(purchase.estimated_amount)}.</span>
          </label>
        )}
        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" variant={mode === "reject" ? "danger" : "success"} disabled={salvando}>
            {salvando ? "Salvando..." : mode === "reject" ? "Recusar pedido" : "Confirmar compra"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
