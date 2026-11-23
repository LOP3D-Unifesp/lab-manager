import { Camera, ImagePlus, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { Equipment } from "../../lib/domain";
import { isAcceptedPhoto, MAX_PHOTOS, resizePhoto } from "../../lib/imageResize";
import {
  getRequestErrorMessage,
  maintenanceUrgencyOptions,
  validateRequestDescription,
  type MaintenanceUrgency,
} from "../../lib/maintenanceRequests";
import { createMaintenanceRequest, uploadMaintenancePhotos } from "../../lib/supabaseRepository";
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
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = photos.map((photo) => photo.preview);

  useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter(isAcceptedPhoto);
    setErro(accepted.length < files.length ? "Só é possível anexar imagens." : "");
    setPhotos((current) =>
      [...current, ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS),
    );
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, position) => position !== index);
    });
  }

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
        <div className="grid gap-2">
          <p className="text-base font-semibold text-text">Fotos (opcional)</p>
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((photo, index) => (
              <div key={photo.preview} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
                <img src={photo.preview} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remover foto ${index + 1}`}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-text/80 text-white"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <>
                <Button variant="secondary" className="min-h-11 px-3 py-2 text-sm" onClick={() => cameraRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                  Tirar foto
                </Button>
                <Button variant="secondary" className="min-h-11 px-3 py-2 text-sm" onClick={() => galleryRef.current?.click()}>
                  <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Anexar
                </Button>
              </>
            ) : null}
          </div>
          <p className="text-sm text-muted">Até {MAX_PHOTOS} fotos; elas são reduzidas antes do envio.</p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
        </div>
        {urgency === "urgent" && equipment.status === "active" ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-sm font-semibold text-danger">
            Chamado urgente bloqueia o equipamento na hora: ele deixa de aceitar novas reservas até um responsável liberar.
          </p>
        ) : null}
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
