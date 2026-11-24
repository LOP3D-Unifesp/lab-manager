import { useT } from "../../i18n";
import { FormEvent, useState } from "react";

import type { Equipment } from "../../lib/domain";
import {
  formatMaintenanceDateTime,
  formatMaintenanceDuration,
  getMaintenanceErrorMessage,
  type MaintenanceEpisode,
} from "../../lib/maintenance";
import { endEquipmentMaintenance } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type EndMaintenanceModalProps = {
  equipment: Equipment;
  episode: MaintenanceEpisode | null;
  timezone: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

export function EndMaintenanceModal({ episode, equipment, onClose, onDone, timezone }: EndMaintenanceModalProps) {
  const t = useT();
  const [notes, setNotes] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function liberar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSalvando(true);
      setErro("");
      await endEquipmentMaintenance(equipment.id, notes.trim() || null);
      await onDone();
    } catch (error) {
      setErro(getMaintenanceErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={t("end.title", { name: equipment.name })}
      description={t("end.hint")}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={liberar}>
        {episode ? (
          <p className="rounded-lg border border-border bg-background p-3 text-base text-text">
            <span className="font-semibold">{episode.reason}</span>
            <br />
            {t("end.since", { date: formatMaintenanceDateTime(episode.started_at, timezone), duration: formatMaintenanceDuration(episode.started_at, null, new Date()) })}
          </p>
        ) : null}
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("end.whatWasDone")}
          <textarea
            autoFocus
            className="min-h-24 min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="success" disabled={salvando}>
            {salvando ? t("common.saving") : t("equipment.release")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
