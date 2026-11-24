import type { FundingGrant } from "../../lib/domain";
import { FundingGrantsEditor } from "./FundingGrantsEditor";
import { inputClassName } from "../ui/formStyles";

type WorkloadFieldProps = {
  isScholarshipHolder: boolean;
  onIsScholarshipHolderChange: (value: boolean) => void;
  grants: FundingGrant[];
  onGrantsChange: (grants: FundingGrant[]) => void;
  totalGrantHours: number;
  manualHours: string;
  onManualHoursChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function WorkloadField({
  isScholarshipHolder,
  onIsScholarshipHolderChange,
  grants,
  onGrantsChange,
  totalGrantHours,
  manualHours,
  onManualHoursChange,
  disabled,
  label = "Carga horaria semanal",
  className = "",
}: WorkloadFieldProps) {
  return (
    <div className={`grid gap-4 ${className}`}>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <label className="grid min-w-0 gap-2 text-base font-semibold text-text">
          Bolsista ou voluntário?
          <select
            className={`${inputClassName} w-full`}
            disabled={disabled}
            onChange={(event) => onIsScholarshipHolderChange(event.target.value === "holder")}
            value={isScholarshipHolder ? "holder" : "volunteer"}
          >
            <option value="holder">Bolsista</option>
            <option value="volunteer">Voluntário</option>
          </select>
          <p className="text-sm font-normal text-muted">
            {isScholarshipHolder
              ? "A carga é a soma das horas das bolsas."
              : "Sem bolsa: informe a carga manualmente."}
          </p>
        </label>

        {isScholarshipHolder ? (
          <label className="grid min-w-0 gap-2 text-base font-semibold text-text">
            {label}
            <input
              className="min-h-11 cursor-not-allowed rounded-lg border border-border bg-primary-soft px-4 text-base font-semibold text-text outline-none"
              disabled
              readOnly
              value={`${totalGrantHours}h`}
            />
          </label>
        ) : (
          <label className="grid min-w-0 gap-2 text-base font-semibold text-text">
            {label}
            <input
              className={`${inputClassName} w-full`}
              disabled={disabled}
              inputMode="numeric"
              max={60}
              min={1}
              onChange={(event) => onManualHoursChange(event.target.value)}
              placeholder="Ex.: 12"
              type="number"
              value={manualHours}
            />
          </label>
        )}
      </div>

      {isScholarshipHolder ? (
        <FundingGrantsEditor value={grants} onChange={onGrantsChange} disabled={disabled} />
      ) : null}
    </div>
  );
}
