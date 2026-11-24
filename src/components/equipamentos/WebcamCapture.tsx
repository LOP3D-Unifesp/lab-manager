import { t, useT } from "../../i18n";
import { useEffect, useRef, useState } from "react";

import { Button } from "../ui/Button";

type WebcamCaptureProps = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

function getCameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return t("webcam.blocked");
  if (name === "NotFoundError") return t("webcam.notFound");
  if (name === "NotReadableError") return t("webcam.inUse");
  return t("webcam.failed");
}

// Pré-visualização da webcam do computador, com botão para capturar a imagem.
export function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErro(t("webcam.unsupported"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 } },
          audio: false,
        });
        if (!ativo) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        if (ativo) setErro(getCameraErrorMessage(error));
      }
    }

    void iniciar();
    return () => {
      ativo = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3">
      {erro ? (
        <p className="text-sm font-semibold text-danger">{erro}</p>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onPlaying={() => setReady(true)}
          className="max-h-72 w-full rounded-md bg-text/10 object-contain"
        />
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" className="min-h-11 px-3 py-2 text-sm" onClick={onClose}>
          {erro ? t("common.close") : t("common.cancel")}
        </Button>
        {!erro ? (
          <Button className="min-h-11 px-3 py-2 text-sm" disabled={!ready} onClick={capturar}>
            {t("webcam.capture")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
