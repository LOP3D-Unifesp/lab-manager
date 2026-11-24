import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  fundingCategoryOptions,
  formatCurrencyBRL,
  getProjectErrorMessage,
  parseAmountInput,
  type FundingAgencyRecord,
  type FundingCategory,
  type ProjectFunding,
} from "../../lib/projects";
import { createFundingAgency, type ProjectFundingInput } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { inputClassName } from "../ui/formStyles";

export type FundingFormItem = { category: FundingCategory; description: string; amount: string };
export type FundingForm = {
  agency_id: string;
  process_number: string;
  grant_name: string;
  starts_on: string;
  ends_on: string;
  items: FundingFormItem[];
};

export function fundingToForm(funding: ProjectFunding[]): FundingForm[] {
  return funding.map((entry) => ({
    agency_id: entry.agency_id,
    process_number: entry.process_number ?? "",
    grant_name: entry.grant_name ?? "",
    starts_on: entry.starts_on ?? "",
    ends_on: entry.ends_on ?? "",
    items: entry.items.map((item) => ({
      category: item.category,
      description: item.description ?? "",
      amount: String(item.amount),
    })),
  }));
}

// Retorna a mensagem de erro de validação ou os dados prontos para a RPC.
export function fundingFormToInput(forms: FundingForm[]): ProjectFundingInput[] | string {
  const result: ProjectFundingInput[] = [];
  for (const form of forms) {
    if (!form.agency_id) return "Escolha a agência de cada fomento.";
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) {
      return "A vigência do fomento termina antes de começar.";
    }
    const items: ProjectFundingInput["items"] = [];
    for (const item of form.items) {
      const amount = parseAmountInput(item.amount);
      if (amount === null) return "Informe um valor válido (maior ou igual a zero) em cada rubrica.";
      items.push({ category: item.category, description: item.description.trim() || null, amount });
    }
    result.push({
      agency_id: form.agency_id,
      process_number: form.process_number.trim() || null,
      grant_name: form.grant_name.trim() || null,
      starts_on: form.starts_on || null,
      ends_on: form.ends_on || null,
      items,
    });
  }
  return result;
}

type FundingEditorProps = {
  value: FundingForm[];
  onChange: (value: FundingForm[]) => void;
  agencies: FundingAgencyRecord[];
  onAgencyCreated: (agency: FundingAgencyRecord) => void;
  disabled?: boolean;
};

export function FundingEditor({ agencies, disabled, onAgencyCreated, onChange, value }: FundingEditorProps) {
  const [novaSigla, setNovaSigla] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [erroAgencia, setErroAgencia] = useState("");

  function atualizar(index: number, patch: Partial<FundingForm>) {
    onChange(value.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function atualizarItem(index: number, itemIndex: number, patch: Partial<FundingFormItem>) {
    onChange(
      value.map((entry, i) =>
        i === index
          ? { ...entry, items: entry.items.map((item, j) => (j === itemIndex ? { ...item, ...patch } : item)) }
          : entry,
      ),
    );
  }

  async function cadastrarAgencia() {
    const acronym = novaSigla.trim();
    if (!acronym) {
      setErroAgencia("Informe a sigla da agência.");
      return;
    }
    try {
      setErroAgencia("");
      const agency = await createFundingAgency({ acronym, name: novoNome.trim() || null });
      onAgencyCreated(agency);
      setNovaSigla("");
      setNovoNome("");
      setMostrarNova(false);
    } catch (error) {
      setErroAgencia(getProjectErrorMessage(error));
    }
  }

  return (
    <div className="grid gap-4">
      {value.length === 0 ? <p className="text-base text-muted">Projeto sem fomento.</p> : null}

      {value.map((entry, index) => {
        const total = entry.items.reduce((sum, item) => sum + (parseAmountInput(item.amount) ?? 0), 0);
        return (
          <div key={index} className="grid gap-3 rounded-lg border border-border bg-background p-4">
            <div className="grid items-start gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Agência
                <select
                  className={inputClassName}
                  disabled={disabled}
                  value={entry.agency_id}
                  onChange={(event) => atualizar(index, { agency_id: event.target.value })}
                >
                  <option value="">Selecione</option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.acronym}
                      {agency.name ? ` — ${agency.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Número do processo
                <input
                  className={inputClassName}
                  disabled={disabled}
                  value={entry.process_number}
                  onChange={(event) => atualizar(index, { process_number: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
                Nome do auxílio ou edital
                <input
                  className={inputClassName}
                  disabled={disabled}
                  value={entry.grant_name}
                  onChange={(event) => atualizar(index, { grant_name: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Início da vigência
                <input
                  className={inputClassName}
                  disabled={disabled}
                  type="date"
                  value={entry.starts_on}
                  onChange={(event) => atualizar(index, { starts_on: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Fim da vigência
                <input
                  className={inputClassName}
                  disabled={disabled}
                  type="date"
                  value={entry.ends_on}
                  onChange={(event) => atualizar(index, { ends_on: event.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-semibold">Valor concedido por rubrica</p>
              {entry.items.map((item, itemIndex) => (
                <div key={itemIndex} className="grid gap-2 sm:grid-cols-[180px_1fr_150px_auto] sm:items-center">
                  <select
                    aria-label="Rubrica"
                    className={inputClassName}
                    disabled={disabled}
                    value={item.category}
                    onChange={(event) => atualizarItem(index, itemIndex, { category: event.target.value as FundingCategory })}
                  >
                    {fundingCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Descrição da rubrica"
                    className={inputClassName}
                    disabled={disabled}
                    placeholder={fundingCategoryOptions.find((o) => o.value === item.category)?.hint}
                    value={item.description}
                    onChange={(event) => atualizarItem(index, itemIndex, { description: event.target.value })}
                  />
                  <input
                    aria-label="Valor em reais"
                    className={inputClassName}
                    disabled={disabled}
                    inputMode="decimal"
                    placeholder="R$ 0,00"
                    value={item.amount}
                    onChange={(event) => atualizarItem(index, itemIndex, { amount: event.target.value })}
                  />
                  <button
                    type="button"
                    title="Remover rubrica"
                    aria-label="Remover rubrica"
                    disabled={disabled}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-danger transition hover:bg-danger-soft"
                    onClick={() => atualizar(index, { items: entry.items.filter((_, j) => j !== itemIndex) })}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  className="min-h-9 px-3 py-2 text-sm"
                  disabled={disabled}
                  onClick={() =>
                    atualizar(index, { items: [...entry.items, { category: "capital", description: "", amount: "" }] })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Adicionar rubrica
                </Button>
                <p className="text-sm font-semibold">Total: {formatCurrencyBRL(total)}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                className="min-h-9 px-3 py-2 text-sm text-danger"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Remover fomento
              </Button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          className="min-h-9 px-3 py-2 text-sm"
          disabled={disabled}
          onClick={() =>
            onChange([
              ...value,
              { agency_id: "", process_number: "", grant_name: "", starts_on: "", ends_on: "", items: [] },
            ])
          }
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Adicionar fomento
        </Button>
        <Button
          variant="ghost"
          className="min-h-9 px-3 py-2 text-sm"
          disabled={disabled}
          onClick={() => setMostrarNova((current) => !current)}
        >
          + Nova agência
        </Button>
      </div>

      {mostrarNova ? (
        <div className="grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            Sigla
            <input className={inputClassName} value={novaSigla} onChange={(event) => setNovaSigla(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Nome (opcional)
            <input className={inputClassName} value={novoNome} onChange={(event) => setNovoNome(event.target.value)} />
          </label>
          <Button onClick={cadastrarAgencia}>Cadastrar</Button>
          {erroAgencia ? <p className="text-sm font-semibold text-danger sm:col-span-3">{erroAgencia}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
