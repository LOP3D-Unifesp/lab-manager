import { useEffect, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";

import { useT } from "../../i18n";
import type { ProjectTask } from "../../lib/projects";
import { LONG_RUNNING_SECONDS, formatDuration, getTaskTimes } from "../../lib/taskTimer";

type TaskTimerProps = {
  task: ProjectTask;
  /** Quando informado, mostra o botão de pausar/retomar (só em Em andamento e Em revisão). */
  onToggle?: (task: ProjectTask, running: boolean) => void;
};

// Tempo da tarefa no cartão: trabalho e revisão separados enquanto ela está em curso, e o total quando termina.
export function TaskTimer({ onToggle, task }: TaskTimerProps) {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const running = task.timer_started_at !== null;

  // Só conta o tempo na tela (a cada segundo) enquanto o cronômetro está correndo.
  useEffect(() => {
    setNow(new Date());
    if (!running) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const times = getTaskTimes(task, now);
  const emCurso = (task.status === "in_progress" || task.status === "review") && task.archived_at === null;
  if (times.total === 0 && !emCurso) return null;

  const longo = running && times.runningFor >= LONG_RUNNING_SECONDS;

  return (
    <div className="grid gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={["flex items-center gap-1.5 font-semibold", running ? "text-primary" : "text-muted"].join(" ")}>
          <Timer className="h-4 w-4" aria-hidden="true" />
          {emCurso ? (
            <span title={t("tasks.timeWork")}>{formatDuration(times.work)}</span>
          ) : (
            <span title={`${t("tasks.timeWork")}: ${formatDuration(times.work)} · ${t("tasks.timeReview")}: ${formatDuration(times.review)}`}>
              {t("tasks.timeTotal")}: {formatDuration(times.total)}
            </span>
          )}
        </span>
        {emCurso && times.review > 0 ? (
          <span className="text-muted">
            {t("tasks.timeReview")}: {formatDuration(times.review)}
          </span>
        ) : null}
        {emCurso && onToggle ? (
          <button
            type="button"
            aria-label={running ? t("tasks.timerPause", { title: task.title }) : t("tasks.timerResume", { title: task.title })}
            title={running ? t("tasks.timerPauseShort") : t("tasks.timerResumeShort")}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-sm font-semibold text-text transition hover:border-primary"
            onClick={() => onToggle(task, !running)}
          >
            {running ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
            {running ? t("tasks.timerPauseShort") : t("tasks.timerResumeShort")}
          </button>
        ) : null}
      </div>
      {longo ? <p className="font-semibold text-warning-dark">{t("tasks.timerLong", { time: formatDuration(times.runningFor) })}</p> : null}
    </div>
  );
}
