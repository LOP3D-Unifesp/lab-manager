import { FormEvent, useState } from "react";

import type { Equipment } from "../../lib/domain";
import {
  getRequestErrorMessage,
  maintenanceUrgencyOptions,
  validateRequestDescription,
  type MaintenanceUrgency,
} from "../../lib/maintenanceRequests";
import { createMaintenanceRequest } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type ReportProblemModalProps = {
  equipment: Equipment;
  openCount: number;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

export function ReportProblemModal({ equipment, onClose, onDone, openCount }: ReportProblemModalProps) {
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<MaintenanceUrgency>("normal");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateRequestDescription(description);
    if (invalid) {
      setErro(invalid);
      return;
    }
    try {
      setSalvando(true);
      setErro("");
      await createMaintenanceRequest({ equipmentId: equipment.id, description, urgency });
      await onDone();
    } catch (error) {
      setErro(getRequestErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={`Reportar problema: ${equipment.name}`}
      description="Os responsáveis pela manutenção são avisados."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={enviar}>
        {openCount > 0 ? (
          <p className="rounded-lg border border-warning-dark bg-warning-soft p-3 text-sm text-text">
            Já há {openCount === 1 ? "1 chamado aberto" : `${openCount} chamados abertos`} para este equipamento. Confira a
            aba Chamados antes de abrir outro.
          </p>
        ) : null}
        <label className="grid gap-2 text-base font-semibold text-text">
          O que está acontecendo?
          <textarea
            autoFocus
            className="min-h-28 min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-base font-semibold text-text">Urgência</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {maintenanceUrgencyOptions.map((option) => (
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
                    name="urgencia"
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
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? "Enviando..." : "Enviar chamado"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
