import { Pencil, Scale } from "lucide-react";

import {
  LOW_STOCK_PERCENT,
  formatAmount,
  getSpoolRemainingPercent,
  getSpoolStatusLabel,
  getSpoolStatusVariant,
  isSpoolLow,
  type MaterialSpool,
} from "../../lib/inventory";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type SpoolCardProps = {
  spool: MaterialSpool;
  onEdit?: (spool: MaterialSpool) => void;
  onAdjust?: (spool: MaterialSpool) => void;
  onMarkEmpty?: (spool: MaterialSpool) => void;
};

export function SpoolCard({ onAdjust, onEdit, onMarkEmpty, spool }: SpoolCardProps) {
  const percent = getSpoolRemainingPercent(spool);
  const low = isSpoolLow(spool);
  const finished = spool.status === "empty" || spool.status === "discarded";

  return (
    <Card className={["flex h-full flex-col gap-3", finished ? "opacity-70" : ""].join(" ")}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1 h-8 w-8 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: spool.color_hex ?? "#ffffff" }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-bold text-text">
            {spool.material_name} · {spool.color_name}
          </h3>
          <p className="truncate text-base text-muted">
            {[spool.manufacturer, spool.diameter_mm ? `${spool.diameter_mm} mm` : null].filter(Boolean).join(" · ") || "Fabricante não informado"}
          </p>
        </div>
        <StatusBadge label={getSpoolStatusLabel(spool.status)} variant={getSpoolStatusVariant(spool.status)} />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2 text-base">
          <span className="font-semibold text-text">{formatAmount(spool.current_amount, spool.unit)}</span>
          <span className="text-sm text-muted">de {formatAmount(spool.initial_amount, spool.unit)}</span>
        </div>
        <div
          role="progressbar"
          aria-label="Peso restante"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-1 h-2 overflow-hidden rounded-full bg-border"
        >
          <div className={["h-full rounded-full", low ? "bg-danger" : "bg-primary"].join(" ")} style={{ width: `${percent}%` }} />
        </div>
        {low ? <p className="mt-1 text-sm font-semibold text-danger">Pouco restante (até {LOW_STOCK_PERCENT}%)</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {spool.project_name ? <StatusBadge label={spool.project_name} variant="info" /> : <StatusBadge label="Estoque geral" variant="neutral" />}
        {spool.storage_location ? <span className="text-sm text-muted">{spool.storage_location}</span> : null}
      </div>

      {onAdjust || onMarkEmpty || onEdit ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            {onAdjust && !finished ? (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"
                onClick={() => onAdjust(spool)}
              >
                <Scale className="h-4 w-4" aria-hidden="true" />
                Ajustar peso
              </button>
            ) : null}
            {onMarkEmpty && !finished ? (
              <button
                type="button"
                className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger"
                onClick={() => onMarkEmpty(spool)}
              >
                Marcar vazio
              </button>
            ) : null}
          </div>
          {onEdit ? (
            <button
              type="button"
              title="Editar rolo"
              aria-label={`Editar rolo ${spool.material_name} ${spool.color_name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
              onClick={() => onEdit(spool)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
