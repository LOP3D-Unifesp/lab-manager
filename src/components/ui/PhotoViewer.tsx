import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

import {
  clampOffset,
  clampZoom,
  distanceBetween,
  neighborIndex,
  stepZoom,
  type Point,
} from "../../lib/photoZoom";

type PhotoViewerProps = {
  photos: Array<{ url: string; alt: string }>;
  startIndex: number;
  onClose: () => void;
};

const iconButton =
  "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40";

// Foto em tela cheia com zoom (botões, roda do mouse, duplo clique ou pinça) e arrasto.
export function PhotoViewer({ onClose, photos, startIndex }: PhotoViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const dragStart = useRef<{ pointer: Point; offset: Point } | null>(null);

  const photo = photos[index];

  const applyZoom = useCallback((next: number) => {
    const stage = stageRef.current;
    const image = imageRef.current;
    const value = clampZoom(next);
    setZoom(value);
    if (!stage || !image) return;
    setOffset((current) =>
      clampOffset(
        current,
        value,
        { width: image.offsetWidth, height: image.offsetHeight },
        { width: stage.clientWidth, height: stage.clientHeight },
      ),
    );
  }, []);

  const go = useCallback(
    (direction: 1 | -1) => {
      setIndex((current) => neighborIndex(current, photos.length, direction));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    },
    [photos.length],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "+" || event.key === "=") applyZoom(stepZoom(zoom, 1));
      else if (event.key === "-") applyZoom(stepZoom(zoom, -1));
      else if (event.key === "0") {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyZoom, go, onClose, zoom]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { distance: distanceBetween(a, b), zoom };
      dragStart.current = null;
      setDragging(false);
    } else if (zoom > 1) {
      dragStart.current = { pointer: { x: event.clientX, y: event.clientY }, offset };
      setDragging(true);
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      applyZoom((pinchStart.current.zoom * distanceBetween(a, b)) / pinchStart.current.distance);
      return;
    }

    const stage = stageRef.current;
    const image = imageRef.current;
    if (dragStart.current && stage && image) {
      setOffset(
        clampOffset(
          {
            x: dragStart.current.offset.x + event.clientX - dragStart.current.pointer.x,
            y: dragStart.current.offset.y + event.clientY - dragStart.current.pointer.y,
          },
          zoom,
          { width: image.offsetWidth, height: image.offsetHeight },
          { width: stage.clientWidth, height: stage.clientHeight },
        ),
      );
    }
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    pinchStart.current = null;
    dragStart.current = null;
    setDragging(false);
  }

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="text-sm font-semibold">
          {photos.length > 1 ? `Foto ${index + 1} de ${photos.length} · ` : ""}
          {Math.round(zoom * 100)}%
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className={iconButton} aria-label="Diminuir zoom" disabled={zoom <= 1} onClick={() => applyZoom(stepZoom(zoom, -1))}>
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" className={iconButton} aria-label="Aumentar zoom" disabled={zoom >= 6} onClick={() => applyZoom(stepZoom(zoom, 1))}>
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label="Voltar ao tamanho original"
            disabled={zoom === 1}
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" autoFocus className={iconButton} aria-label="Fechar" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={[
          "relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden",
          zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in",
        ].join(" ")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onWheel={(event) => applyZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25))}
        onDoubleClick={() => {
          if (zoom > 1) {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          } else {
            applyZoom(2.5);
          }
        }}
      >
        <img
          ref={imageRef}
          src={photo.url}
          alt={photo.alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: dragging || pointers.current.size > 1 ? "none" : "transform 120ms ease-out",
          }}
        />
        {index > 0 ? (
          <button
            type="button"
            aria-label="Foto anterior"
            className={`${iconButton} absolute left-3 top-1/2 -translate-y-1/2`}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}
        {index < photos.length - 1 ? (
          <button
            type="button"
            aria-label="Próxima foto"
            className={`${iconButton} absolute right-3 top-1/2 -translate-y-1/2`}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onClick={() => go(1)}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
