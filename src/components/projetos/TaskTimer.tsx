import { useEffect, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";

import { useT } from "../../i18n";
import { useCurrentProfile } from "../../lib/currentUser";
import type { ProjectTask } from "../../lib/projects";
import { AUTO_PAUSE_HOURS, LONG_RUNNING_SECONDS, elapsedSeconds, formatClock, formatDuration, getMyTimer, getTaskTimes } from "../../lib/taskTimer";
import { Avatar } from "../ui/Avatar";

type TaskTimerProps = {
  task: ProjectTask;
  /** Quando informado, mostra o botão de pausar/retomar o timer de quem está logado (só em Em andamento e Em revisão). */
  onToggle?: (task: ProjectTask, running: boolean) => void;
};

// Relógio da tela: atualiza a cada segundo, mas só enquanto `ativo` (algum timer correndo).
export function useNow(ativo: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    if (!ativo) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [ativo]);
  return now;
}

// Tempo da tarefa no cartão: soma de todos enquanto ela está em curso (com quem está trabalhando agora) e o total quando
// termina. Cada pessoa liga e pausa o seu próprio timer.
export function TaskTimer({ onToggle, task }: TaskTimerProps) {
  const t = useT();
  const { currentProfile } = useCurrentProfile();
  const now = useNow(task.running.length > 0);
  const times = getTaskTimes(task, now);
  const mine = getMyTimer(task, currentProfile?.id);
  const emCurso = (task.status === "in_progress" || task.status === "review") && task.archived_at === null;
  if (times.total === 0 && !emCurso) return null;

  const minhaDuracao = mine ? elapsedSeconds(mine.started_at, now) : 0;
  const longo = mine !== null && minhaDuracao >= LONG_RUNNING_SECONDS;

  return (
    <div className="grid gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={["flex items-center gap-1.5 font-semibold", times.running ? "text-primary" : "text-muted"].join(" ")}>
          <Timer className="h-4 w-4" aria-hidden="true" />
          {emCurso ? (
            <span title={t("tasks.timeWork")} className="tabular-nums">
              {formatClock(times.work)}
            </span>
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
        {emCurso && onToggle && currentProfile ? (
          <button
            type="button"
            aria-label={mine ? t("tasks.timerPause", { title: task.title }) : t("tasks.timerResume", { title: task.title })}
            title={mine ? t("tasks.timerPauseShort") : t("tasks.timerStartShort")}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-sm font-semibold text-text transition hover:border-primary"
            onClick={() => onToggle(task, !mine)}
          >
            {mine ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
            {mine ? t("tasks.timerPauseShort") : t("tasks.timerStartShort")}
          </button>
        ) : null}
      </div>
      {emCurso && task.running.length > 0 ? (
        <div className="flex items-center gap-2 text-muted">
          <div className="flex -space-x-1.5">
            {task.running.map((timer) => (
              <Avatar key={timer.profile_id} avatarUrl={timer.avatar_url} name={timer.full_name} className="h-5 w-5 ring-2 ring-surface" />
            ))}
          </div>
          <span>
            {task.running.length === 1
              ? t("tasks.workingOne", { name: task.running[0].full_name.split(" ")[0] })
              : t("tasks.workingMany", { count: task.running.length })}
          </span>
        </div>
      ) : null}
      {longo ? <p className="font-semibold text-warning-dark">{t("tasks.timerLong", { time: formatDuration(minhaDuracao), hours: AUTO_PAUSE_HOURS })}</p> : null}
    </div>
  );
}
