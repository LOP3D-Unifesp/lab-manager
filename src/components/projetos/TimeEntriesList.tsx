import { getLocale, useT } from "../../i18n";
import type { TimeEntry } from "../../lib/taskTime";
import { elapsedSeconds, formatDuration } from "../../lib/taskTimer";

type TimeEntriesListProps = {
  entries: TimeEntry[];
  now: Date;
};

// Trechos de tempo da tarefa, só para consulta: ninguém altera um trecho depois de registrado (o relógio é do sistema).
export function TimeEntriesList({ entries, now }: TimeEntriesListProps) {
  const t = useT();
  if (entries.length === 0) return null;

  const formatar = (iso: string) =>
    new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const ordenados = [...entries].sort((a, b) => b.started_at.localeCompare(a.started_at));

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer px-3 py-2 text-base font-semibold text-text">{t("tasks.entriesTitle", { count: entries.length })}</summary>
      <ul className="grid gap-2 px-3 pb-3">
        {ordenados.map((entry) => {
          const aberto = entry.ended_at === null;
          const segundos = aberto ? elapsedSeconds(entry.started_at, now) : (entry.seconds ?? 0);
          return (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-background p-2 text-sm">
              <span className="font-semibold text-text">{entry.full_name}</span>
              <span className="text-muted">{entry.phase === "review" ? t("tasks.timeReview") : t("tasks.timeWork")}</span>
              <span className="tabular-nums text-muted">
                {formatar(entry.started_at)} → {aberto ? t("tasks.entryRunning") : formatar(entry.ended_at ?? "")}
              </span>
              <span className="font-semibold tabular-nums text-text">{formatDuration(segundos)}</span>
              {entry.auto_closed ? (
                <span className="rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-dark">{t("tasks.entryAuto")}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
