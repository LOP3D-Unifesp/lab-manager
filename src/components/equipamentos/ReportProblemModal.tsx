import { useT } from "../../i18n";
import { FormEvent, useState } from "react";

import type { Equipment } from "../../lib/domain";
import { resizePhoto } from "../../lib/imageResize";
import {
  getRequestErrorMessage,
  maintenanceUrgencyOptions,
  validateRequestDescription,
  type MaintenanceUrgency,
} from "../../lib/maintenanceRequests";
import { createMaintenanceRequest, uploadMaintenancePhotos } from "../../lib/supabaseRepository";
import { PhotoAttachments, type PendingPhoto } from "../ui/PhotoAttachments";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type ReportProblemModalProps = {
  equipment: Equipment;
  openCount: number;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

export function ReportProblemModal({ equipment, onClose, onDone, openCount }: ReportProblemModalProps) {
  const t = useT();
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<MaintenanceUrgency>("normal");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

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
      const photoPaths =
        photos.length > 0 ? await uploadMaintenancePhotos(await Promise.all(photos.map((photo) => resizePhoto(photo.file)))) : [];
      await createMaintenanceRequest({ equipmentId: equipment.id, description, urgency, photoPaths });
      await onDone();
    } catch (error) {
      setErro(getRequestErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={t("report.title", { name: equipment.name })}
      description={t("report.hint")}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={enviar}>
        {openCount > 0 ? (
          <p className="rounded-lg border border-warning-dark bg-warning-soft p-3 text-sm text-text">
            {t("report.alreadyOpen", { count: openCount })}
          </p>
        ) : null}
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("report.whatsHappening")}
          <textarea
            autoFocus
            className="min-h-28 min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-base font-semibold text-text">{t("report.urgency")}</legend>
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
        <PhotoAttachments photos={photos} onChange={setPhotos} onError={setErro} />
        {urgency === "urgent" && equipment.status === "active" ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-sm font-semibold text-danger">
            {t("report.urgentWarning")}
          </p>
        ) : null}
        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? t("report.sending") : t("report.send")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
