export const MAX_PHOTO_SIDE = 1600;
export const MAX_PHOTOS = 3;

// Reduz as dimensões para caber em `max` pixels no maior lado, sem ampliar e mantendo a proporção.
export function fitWithin(width: number, height: number, max: number) {
  const largest = Math.max(width, height);
  if (largest <= max) return { width, height };
  const scale = max / largest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function isAcceptedPhoto(file: { type: string }) {
  return file.type.startsWith("image/");
}

// Foto do celular costuma ter vários MB; reduz e converte para JPEG antes de enviar.
export async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a foto.");
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("Não foi possível preparar a foto.");
    return blob;
  } finally {
    bitmap.close();
  }
}
