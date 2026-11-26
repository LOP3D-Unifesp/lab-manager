import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import { useT } from "../../i18n";
import { getChecklistProgress } from "../../lib/projects";
import { inputClassName } from "../ui/formStyles";

export type ChecklistDraftItem = { id: string; title: string; done: boolean };

type ChecklistEditorProps = {
  items: ChecklistDraftItem[];
  onChange: (items: ChecklistDraftItem[]) => void;
};

// Checklist (subtarefas) dentro do modal da tarefa: adiciona, marca, renomeia, reordena e remove. Quem decide quando
// gravar é o modal (numa tarefa já criada, grava sozinho).
export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const t = useT();
  const [novo, setNovo] = useState("");
  const progresso = getChecklistProgress(items);

  function adicionar() {
    const title = novo.trim();
    if (!title) return;
    onChange([...items, { id: crypto.randomUUID(), title, done: false }]);
    setNovo("");
  }

  function alterar(id: string, patch: Partial<ChecklistDraftItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function mover(indice: number, delta: number) {
    const destino = indice + delta;
    if (destino < 0 || destino >= items.length) return;
    const copia = [...items];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onChange(copia);
  }

  return (
    <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <legend className="mb-1 flex w-full items-center justify-between gap-2 text-base font-semibold text-text">
        <span>{t("checklist.title")}</span>
        {items.length > 0 ? (
          <span className="text-sm font-semibold text-muted">
            {progresso.done}/{progresso.total}
          </span>
        ) : null}
      </legend>

      {items.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {items.map((item, indice) => (
            <li key={item.id} className="flex min-w-0 items-center gap-1 sm:gap-2">
              <input
                type="checkbox"
                aria-label={t("checklist.done", { title: item.title })}
                className="h-5 w-5 shrink-0 accent-primary"
                checked={item.done}
                onChange={(event) => alterar(item.id, { done: event.target.checked })}
              />
              <input
                aria-label={t("checklist.itemTitle")}
                className={`${inputClassName} w-0 min-w-0 flex-1 ${item.done ? "text-muted line-through" : ""}`}
                maxLength={200}
                value={item.title}
                onChange={(event) => alterar(item.id, { title: event.target.value })}
              />
              <button
                type="button"
                aria-label={t("checklist.moveUp", { title: item.title })}
                disabled={indice === 0}
                className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-background disabled:opacity-30"
                onClick={() => mover(indice, -1)}
              >
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t("checklist.moveDown", { title: item.title })}
                disabled={indice === items.length - 1}
                className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-background disabled:opacity-30"
                onClick={() => mover(indice, 1)}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t("checklist.remove", { title: item.title })}
                className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-danger-dark hover:bg-danger-soft"
                onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          aria-label={t("checklist.newItem")}
          className={`${inputClassName} min-w-0 flex-1`}
          maxLength={200}
          placeholder={t("checklist.placeholder")}
          value={novo}
          onChange={(event) => setNovo(event.target.value)}
          // Sair do campo também adiciona: o item digitado não se perde ao fechar ou salvar.
          onBlur={adicionar}
          onKeyDown={(event) => {
            // Enter adiciona o item em vez de salvar a tarefa inteira.
            if (event.key === "Enter") {
              event.preventDefault();
              adicionar();
            }
          }}
        />
        <button
          type="button"
          aria-label={t("checklist.add")}
          title={t("checklist.add")}
          className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text transition hover:border-primary"
          onClick={adicionar}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </fieldset>
  );
}
