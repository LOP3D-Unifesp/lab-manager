import { Plus, Trash2 } from "lucide-react";

import { fundingAgencyOptions, type FundingAgency, type FundingGrant } from "../../lib/domain";
import { Button } from "../ui/Button";

type FundingGrantsEditorProps = {
  value: FundingGrant[];
  onChange: (grants: FundingGrant[]) => void;
  disabled?: boolean;
};

const inputClassName =
  "min-h-11 rounded-lg border border-border bg-surface px-4 text-base font-normal outline-none transition focus:border-primary";

export function FundingGrantsEditor({ value, onChange, disabled }: FundingGrantsEditorProps) {
  function addGrant() {
    onChange([
      ...value,
      {
        agency: "cnpq",
        agency_other: null,
        grant_name: null,
        weekly_hours: null,
        monthly_value: null,
      },
    ]);
  }

  function removeGrant(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function updateGrant(index: number, patch: Partial<FundingGrant>) {
    onChange(value.map((grant, i) => (i === index ? { ...grant, ...patch } : grant)));
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">Bolsas de fomento</p>
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 px-3 py-2 text-sm"
          disabled={disabled}
          onClick={addGrant}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Adicionar bolsa
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma bolsa cadastrada.</p>
      ) : (
        value.map((grant, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-border bg-background p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-semibold">
                Agência
                <select
                  className={inputClassName}
                  disabled={disabled}
                  value={grant.agency}
                  onChange={(event) => {
                    const agency = event.target.value as FundingAgency;
                    updateGrant(index, {
                      agency,
                      agency_other: agency === "other" ? grant.agency_other : null,
                    });
                  }}
                >
                  {fundingAgencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {grant.agency === "other" ? (
                <label className="grid gap-2 text-sm font-semibold">
                  Qual agência?
                  <input
                    className={inputClassName}
                    disabled={disabled}
                    maxLength={120}
                    onChange={(event) => updateGrant(index, { agency_other: event.target.value })}
                    required
                    value={grant.agency_other ?? ""}
                  />
                </label>
              ) : (
                <div aria-hidden="true" />
              )}

              <Button
                type="button"
                variant="danger"
                className="min-h-9 px-3 py-2 text-sm"
                disabled={disabled}
                onClick={() => removeGrant(index)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Nome da bolsa
                <input
                  className={inputClassName}
                  disabled={disabled}
                  maxLength={120}
                  onChange={(event) => updateGrant(index, { grant_name: event.target.value || null })}
                  placeholder="Opcional"
                  value={grant.grant_name ?? ""}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Horas semanais
                <input
                  className={inputClassName}
                  disabled={disabled}
                  inputMode="numeric"
                  min={1}
                  max={60}
                  onChange={(event) =>
                    updateGrant(index, {
                      weekly_hours: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="Opcional"
                  type="number"
                  value={grant.weekly_hours ?? ""}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Valor mensal (R$)
                <input
                  className={inputClassName}
                  disabled={disabled}
                  inputMode="decimal"
                  min={0}
                  onChange={(event) =>
                    updateGrant(index, {
                      monthly_value: event.target.value ? Number(event.target.value) : null,
                    })
                  }
                  placeholder="Opcional"
                  step="0.01"
                  type="number"
                  value={grant.monthly_value ?? ""}
                />
              </label>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
