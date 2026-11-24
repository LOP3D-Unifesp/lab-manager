import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useT } from "../../i18n";
import { isAcceptedPhoto, MAX_PHOTOS } from "../../lib/imageResize";
import { WebcamCapture } from "../equipamentos/WebcamCapture";
import { Button } from "./Button";

export type PendingPhoto = { file: File; preview: string };

type PhotoAttachmentsProps = {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  /** Recebe a mensagem de erro (ou texto vazio quando não há erro). */
  onError: (message: string) => void;
};

// Escolha de fotos (câmera, webcam ou galeria) para anexar a um chamado ou a uma mensagem de feedback.
// Quem usa guarda a lista em `photos` e, ao enviar, redimensiona cada `file` (ver `resizePhoto`).
export function PhotoAttachments({ onChange, onError, photos }: PhotoAttachmentsProps) {
  const t = useT();
  const [webcamOpen, setWebcamOpen] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<string[]>([]);
  previewsRef.current = photos.map((photo) => photo.preview);

  useEffect(() => () => previewsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // Celular e tablet abrem a câmera nativa; no computador usamos a webcam do navegador.
  function takePhoto() {
    if (window.matchMedia("(pointer: coarse)").matches) cameraRef.current?.click();
    else setWebcamOpen(true);
  }

  function addPhotos(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    const accepted = list.filter(isAcceptedPhoto);
    onError(accepted.length < list.length ? t("report.imagesOnly") : "");
    onChange([...photos, ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, MAX_PHOTOS));
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].preview);
    onChange(photos.filter((_, position) => position !== index));
  }

  return (
    <div className="grid gap-2">
      <p className="text-base font-semibold text-text">{t("report.photos")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {photos.map((photo, index) => (
          <div key={photo.preview} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            <img src={photo.preview} alt={t("report.photoAlt", { n: index + 1 })} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={t("report.removePhoto", { n: index + 1 })}
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-text/80 text-white"
              onClick={() => removePhoto(index)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <>
            <Button variant="secondary" className="min-h-11 px-3 py-2 text-sm" onClick={takePhoto}>
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("report.takePhoto")}
            </Button>
            <Button variant="secondary" className="min-h-11 px-3 py-2 text-sm" onClick={() => galleryRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("report.attach")}
            </Button>
          </>
        ) : null}
      </div>
      {webcamOpen ? (
        <WebcamCapture
          onCapture={(file) => {
            addPhotos([file]);
            setWebcamOpen(false);
          }}
          onClose={() => setWebcamOpen(false)}
        />
      ) : null}
      <p className="text-sm text-muted">{t("report.photoLimit", { max: MAX_PHOTOS })}</p>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          addPhotos(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          addPhotos(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
