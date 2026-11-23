import { FormEvent, useState } from "react";

import { createPurchaseRequest, updatePurchaseRequest } from "../../lib/supabaseRepository";
import type { Project } from "../../lib/projects";
import { getPurchaseErrorMessage, parseMoney, purchaseCategoryOptions, validatePurchaseForm, type PurchaseRequest } from "../../lib/purchases";
import type { FundingCategory } from "../../lib/projects";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type PurchaseFormModalProps = {
  projects: Project[];
  purchase: PurchaseRequest | null; // null = novo pedido
  defaultProjectId: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

const inputClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary";

function formatAmountForInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function PurchaseFormModal({ defaultProjectId, onClose, onDone, projects, purchase }: PurchaseFormModalProps) {
  const [projectId, setProjectId] = useState(purchase?.project_id ?? defaultProjectId);
  const [category, setCategory] = useState<string>(purchase?.funding_category ?? "");
  const [item, setItem] = useState(purchase?.item ?? "");
  const [url, setUrl] = useState(purchase?.url ?? "");
  const [quantity, setQuantity] = useState(String(purchase?.quantity ?? 1));
  const [amount, setAmount] = useState(purchase ? formatAmountForInput(purchase.estimated_amount) : "");
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validatePurchaseForm({ projectId, category, item, url, quantity, amount, notes });
    if (invalid) {
      setErro(invalid);
      return;
    }
    const input = {
      item,
      url: url.trim() || null,
      quantity: Number(quantity),
      estimatedAmount: parseMoney(amount) as number,
      notes: notes.trim() || null,
      fundingCategory: category as FundingCategory,
    };
    try {
      setSalvando(true);
      setErro("");
      if (purchase) await updatePurchaseRequest(purchase.id, input);
      else await createPurchaseRequest({ ...input, projectId });
      await onDone();
    } catch (error) {
      setErro(getPurchaseErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={purchase ? "Editar pedido" : "Novo pedido de compra"}
      description="O coordenador analisa o pedido e acompanha até a entrega."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={salvar}>
        <label className="grid gap-2 text-base font-semibold text-text">
          Projeto
          <select
            className={inputClassName}
            disabled={Boolean(purchase)}
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projects.length === 0 ? (
            <span className="text-sm font-normal text-danger">Você não participa de nenhum projeto em aberto.</span>
          ) : null}
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          Rubrica
          <select className={inputClassName} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="" disabled>
              Selecione
            </option>
            {purchaseCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          Item
          <input autoFocus className={inputClassName} maxLength={200} value={item} onChange={(event) => setItem(event.target.value)} />
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          Link (opcional)
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
            Quantidade
            <input className={inputClassName} inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            Valor estimado total (R$)
            <input
              className={inputClassName}
              inputMode="decimal"
              placeholder="129,90"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
        </div>
        <label className="grid gap-2 text-base font-semibold text-text">
          Observações (opcional)
          <textarea
            className={`${inputClassName} min-h-20 py-3`}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando || projects.length === 0}>
            {salvando ? "Salvando..." : purchase ? "Salvar alterações" : "Enviar pedido"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
