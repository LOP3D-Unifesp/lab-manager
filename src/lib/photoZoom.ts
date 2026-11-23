export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

// A foto só pode ser arrastada enquanto ela passa dos limites da área visível; sem zoom, fica centralizada.
export function clampOffset(offset: Point, zoom: number, image: Size, container: Size): Point {
  const limitX = Math.max(0, (image.width * zoom - container.width) / 2);
  const limitY = Math.max(0, (image.height * zoom - container.height) / 2);
  return {
    // `|| 0` evita o -0 quando a foto cabe na área.
    x: Math.min(limitX, Math.max(-limitX, offset.x)) || 0,
    y: Math.min(limitY, Math.max(-limitY, offset.y)) || 0,
  };
}

export function distanceBetween(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Passo dos botões + e -: 25% por clique, arredondando para evitar sobras de ponto flutuante.
export function stepZoom(current: number, direction: 1 | -1) {
  return clampZoom(Math.round((current + direction * 0.25) * 100) / 100);
}

// Índice da foto vizinha, sem passar das pontas.
export function neighborIndex(index: number, total: number, direction: 1 | -1) {
  return Math.min(total - 1, Math.max(0, index + direction));
}
