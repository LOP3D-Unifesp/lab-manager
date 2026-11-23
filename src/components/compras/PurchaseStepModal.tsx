import { FormEvent, useState } from "react";

import { formatCurrencyBRL } from "../../lib/projects";
import { getPurchaseErrorMessage, parseMoney, type PurchaseRequest } from "../../lib/purchases";
import { setPurchaseStatus } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type PurchaseStepModalProps = {
  mode: "reject" | "purchase";
  purchase: PurchaseRequest;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

const inputClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary";

// Recusar (com motivo) ou marcar como comprado (com o valor pago).
export function PurchaseStepModal({ mode, onClose, onDone, purchase }: PurchaseStepModalProps) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(purchase.estimated_amount.toFixed(2).replace(".", ","));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let actualAmount: number | null = null;
    if (mode === "purchase") {
      actualAmount = parseMoney(amount);
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
            <input autoFocus className={inputClassName} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
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
