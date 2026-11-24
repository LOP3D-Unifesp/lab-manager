import { useT } from "../../i18n";
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
  const t = useT();
  const summary = summarizeMaintenance(episodes);
  const now = new Date();

  return (
    <Modal title={t("history.title", { name: equipment.name })} onClose={onClose}>
      <div className="grid gap-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-muted">{t("history.stops")}</dt>
            <dd className="text-xl font-bold text-text">{summary.count}</dd>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-muted">{t("history.average")}</dt>
            <dd className="text-xl font-bold text-text">{summary.averageMs === null ? "—" : formatDurationMs(summary.averageMs)}</dd>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-muted">{t("history.longest")}</dt>
            <dd className="text-xl font-bold text-text">{summary.longestMs === null ? "—" : formatDurationMs(summary.longestMs)}</dd>
          </div>
        </dl>

        {episodes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">{t("history.none")}</p>
        ) : (
          <ul className="grid gap-3">
            {episodes.map((episode) => (
              <li key={episode.id} className="grid gap-1 rounded-lg border border-border bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-bold text-text">{episode.reason}</p>
                  <StatusBadge
                    label={episode.ended_at ? formatMaintenanceDuration(episode.started_at, episode.ended_at, now) : t("history.inProgress")}
                    variant={episode.ended_at ? "neutral" : "warning"}
                  />
                </div>
                <p className="text-sm text-muted">
                  {formatMaintenanceDateTime(episode.started_at, timezone)}
                  {episode.started_by_name ? t("history.byPerson", { name: episode.started_by_name }) : ""} →{" "}
                  {episode.ended_at
                    ? `${formatMaintenanceDateTime(episode.ended_at, timezone)}${episode.ended_by_name ? t("history.byPerson", { name: episode.ended_by_name }) : ""}`
                    : t("history.stillOngoing")}
                </p>
                {episode.notes ? <p className="text-sm text-text">{episode.notes}</p> : null}
                {episode.resolution_notes ? <p className="text-sm text-text">{t("history.resolved", { notes: episode.resolution_notes })}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
