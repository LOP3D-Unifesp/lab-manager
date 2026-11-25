import { t } from "../../i18n";
import { inputClassName } from "../ui/formStyles";

type WorkloadFieldProps = {
  /** Soma das horas das bolsas vigentes; quando é maior que zero, a carga vem das bolsas. */
  grantHours: number;
  manualHours: string;
  onManualHoursChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

// Carga horária semanal: de quem tem bolsa vigente é a soma das horas das bolsas (cadastradas no cartão de bolsas);
// de quem não tem é informada à mão.
export function WorkloadField({
  grantHours,
  manualHours,
  onManualHoursChange,
  disabled,
  label = t("workload.label"),
  className = "",
}: WorkloadFieldProps) {
  const fromGrants = grantHours > 0;

  return (
    <label className={`grid min-w-0 gap-2 text-base font-semibold text-text ${className}`}>
      {label}
      {fromGrants ? (
        <input
          className="min-h-11 cursor-not-allowed rounded-lg border border-border bg-primary-soft px-4 text-base font-semibold text-text outline-none"
          disabled
          readOnly
          value={`${grantHours}h`}
        />
      ) : (
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
      )}
      <span className="text-sm font-normal text-muted">{fromGrants ? t("workload.sumOfGrants") : t("workload.manual")}</span>
    </label>
  );
}
