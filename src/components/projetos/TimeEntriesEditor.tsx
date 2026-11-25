import { useState } from "react";

import { getLocale, useT } from "../../i18n";
import { getTaskErrorMessage } from "../../lib/projects";
import { adjustTimeEntry } from "../../lib/supabaseRepository";
import type { TimeEntry } from "../../lib/taskTime";
import { elapsedSeconds, formatDuration } from "../../lib/taskTimer";
import { Button } from "../ui/Button";
import { inputClassName } from "../ui/formStyles";

type TimeEntriesEditorProps = {
  entries: TimeEntry[];
  profileId: string | undefined;
  isCoordinator: boolean;
  now: Date;
  onChanged: () => void;
};

// <input type="datetime-local"> trabalha com a hora local, sem fuso.
function toLocalInput(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

// Lista os trechos de tempo da tarefa e deixa corrigir o horário em que cada um terminou (esquecimento de pausar,
// pausa automática). Cada pessoa corrige os seus; coordenadores corrigem qualquer um.
export function TimeEntriesEditor({ entries, isCoordinator, now, onChanged, profileId }: TimeEntriesEditorProps) {
  const t = useT();
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (entries.length === 0) return null;

  const formatar = (iso: string) =>
    new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const ordenados = [...entries].sort((a, b) => b.started_at.localeCompare(a.started_at));

  function abrir(entry: TimeEntry) {
    setErro("");
    setEditando(entry.id);
    setValor(toLocalInput(entry.ended_at ? new Date(entry.ended_at) : now));
  }

  async function salvar(entry: TimeEntry) {
    const fim = new Date(valor);
    if (Number.isNaN(fim.getTime())) return;
    try {
      setSalvando(true);
      setErro("");
      await adjustTimeEntry(entry.id, fim);
      setEditando(null);
      onChanged();
    } catch (error) {
      setErro(getTaskErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer px-3 py-2 text-base font-semibold text-text">{t("tasks.entriesTitle", { count: entries.length })}</summary>
      <ul className="grid gap-2 px-3 pb-3">
        {ordenados.map((entry) => {
          const aberto = entry.ended_at === null;
          const podeAjustar = isCoordinator || entry.profile_id === profileId;
          const segundos = aberto ? elapsedSeconds(entry.started_at, now) : (entry.seconds ?? 0);
          return (
            <li key={entry.id} className="grid gap-2 rounded-md border border-border bg-background p-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-text">{entry.full_name}</span>
                <span className="text-muted">{entry.phase === "review" ? t("tasks.timeReview") : t("tasks.timeWork")}</span>
                <span className="tabular-nums text-muted">
                  {formatar(entry.started_at)} → {aberto ? t("tasks.entryRunning") : formatar(entry.ended_at ?? "")}
                </span>
                <span className="font-semibold tabular-nums text-text">{formatDuration(segundos)}</span>
                {entry.auto_closed ? <span className="rounded-full border border-warning bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-dark">{t("tasks.entryAuto")}</span> : null}
                {podeAjustar && editando !== entry.id ? (
                  <button type="button" className="ml-auto font-semibold text-primary underline" onClick={() => abrir(entry)}>
                    {aberto ? t("tasks.entryStop") : t("tasks.entryAdjust")}
                  </button>
                ) : null}
              </div>
              {editando === entry.id ? (
                <div className="grid gap-2">
                  <label className="grid gap-1 text-sm font-semibold text-text">
                    {t("tasks.entryEndedAt")}
                    <input
                      className={inputClassName}
                      type="datetime-local"
                      min={toLocalInput(new Date(entry.started_at))}
                      max={toLocalInput(now)}
                      value={valor}
                      onChange={(event) => setValor(event.target.value)}
                    />
                  </label>
                  {erro ? <p className="text-sm font-semibold text-danger">{erro}</p> : null}
                  <div className="flex gap-2">
                    <Button disabled={salvando} onClick={() => void salvar(entry)}>
                      {t("tasks.entrySave")}
                    </Button>
                    <Button variant="secondary" onClick={() => setEditando(null)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
