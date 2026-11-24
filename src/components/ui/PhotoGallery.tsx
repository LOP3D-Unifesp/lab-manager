import { useEffect, useState } from "react";

import { useT } from "../../i18n";
import { createZip, slugifyFileName } from "../../lib/zip";
import { Button } from "./Button";
import { PhotoViewer } from "./PhotoViewer";

type PhotoGalleryProps = {
  paths: string[];
  /** Endereços temporários das fotos (buckets privados), por caminho. */
  loadUrls: (paths: string[]) => Promise<Record<string, string>>;
  /** Nome do arquivo .zip (sem extensão). */
  zipName: string;
  /** Texto alternativo da foto número `n` (começa em 1). */
  altFor: (n: number) => string;
};

// Miniaturas que abrem no visualizador com zoom e, com mais de uma foto, botão para baixar tudo em .zip.
export function PhotoGallery({ altFor, loadUrls, paths, zipName }: PhotoGalleryProps) {
  const t = useT();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const key = paths.join("|");

  useEffect(() => {
    let active = true;
    loadUrls(key ? key.split("|") : [])
      .then((result) => active && setUrls(result))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key, loadUrls]);

  async function download() {
    try {
      setDownloading(true);
      setError("");
      const files = await Promise.all(
        paths.map(async (path, index) => {
          const url = urls[path];
          if (!url) throw new Error(t("requests.photosLoading"));
          const response = await fetch(url);
          if (!response.ok) throw new Error(t("requests.photoDownloadFailed"));
          return { name: `foto-${index + 1}.jpg`, data: new Uint8Array(await response.arrayBuffer()) };
        }),
      );
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([createZip(files)], { type: "application/zip" }));
      link.download = `${slugifyFileName(zipName)}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("requests.photosDownloadFailed"));
    } finally {
      setDownloading(false);
    }
  }

  if (paths.length === 0) return null;

  const viewable = paths.filter((path) => urls[path]);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {paths.map((path, index) =>
          urls[path] ? (
            <button
              key={path}
              type="button"
              aria-label={t("requests.enlargePhoto", { n: index + 1 })}
              className="overflow-hidden rounded-lg border border-border transition hover:border-primary"
              onClick={() => setViewerIndex(viewable.indexOf(path))}
            >
              <img src={urls[path]} alt={altFor(index + 1)} className="h-20 w-20 object-cover" />
            </button>
          ) : (
            <div key={path} className="h-20 w-20 rounded-lg border border-border bg-background" />
          ),
        )}
      </div>
      {paths.length > 1 ? (
        <div>
          <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={downloading} onClick={download}>
            {downloading ? t("requests.preparing") : t("requests.downloadPhotos", { count: paths.length })}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
      {viewerIndex !== null ? (
        <PhotoViewer
          photos={viewable.map((path, position) => ({
            url: urls[path],
            alt: altFor(position + 1),
          }))}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </div>
  );
}
