import type { Equipment } from "../../lib/domain";
import { formatDurationMs, formatMaintenanceDateTime, formatMaintenanceDuration, summarizeMaintenance, type MaintenanceEpisode } from "../../lib/maintenance";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";

type MaintenanceHistoryModalProps = {
  equipment: Equipment;
  episodes: MaintenanceEpisode[];
  timezone: string;
  onClose: () => void;
};

export function MaintenanceHistoryModal({ episodes, equipment, onClose, timezone }: MaintenanceHistoryModalProps) {
  const summary = summarizeMaintenance(episodes);
  const now = new Date();

  return (
    <Modal title={`Histórico de manutenção de ${equipment.name}`} onClose={onClose}>
      <div className="grid gap-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-muted">Paradas</dt>
            <dd className="text-xl font-bold text-text">{summary.count}</dd>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-muted">Duração média</dt>
            <dd className="text-xl font-bold text-text">{summary.averageMs === null ? "—" : formatDurationMs(summary.averageMs)}</dd>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-muted">Maior parada</dt>
            <dd className="text-xl font-bold text-text">{summary.longestMs === null ? "—" : formatDurationMs(summary.longestMs)}</dd>
          </div>
        </dl>

        {episodes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">Nenhuma manutenção registrada.</p>
        ) : (
          <ul className="grid gap-3">
            {episodes.map((episode) => (
              <li key={episode.id} className="grid gap-1 rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-bold text-text">{episode.reason}</p>
                  <StatusBadge
                    label={episode.ended_at ? formatMaintenanceDuration(episode.started_at, episode.ended_at, now) : "Em andamento"}
                    variant={episode.ended_at ? "neutral" : "warning"}
                  />
                </div>
                <p className="text-sm text-muted">
                  {formatMaintenanceDateTime(episode.started_at, timezone)}
                  {episode.started_by_name ? ` por ${episode.started_by_name}` : ""} →{" "}
                  {episode.ended_at
                    ? `${formatMaintenanceDateTime(episode.ended_at, timezone)}${episode.ended_by_name ? ` por ${episode.ended_by_name}` : ""}`
                    : "ainda em manutenção"}
                </p>
                {episode.notes ? <p className="text-sm text-text">{episode.notes}</p> : null}
                {episode.resolution_notes ? <p className="text-sm text-text">Resolvido: {episode.resolution_notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
