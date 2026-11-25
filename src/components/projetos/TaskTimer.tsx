import { useEffect, useState, type ReactNode } from "react";
import { Pause, Play, Timer } from "lucide-react";

import { useT } from "../../i18n";
import { useAuth } from "../../lib/auth";
import { useCurrentProfile } from "../../lib/currentUser";
import type { ProjectTask } from "../../lib/projects";
import { elapsedSeconds, formatClock, formatDuration, getMyTimer, getTaskTimes } from "../../lib/taskTimer";

type TaskTimerProps = {
  task: ProjectTask;
  /** Quando informado, mostra o botão de pausar/retomar o timer de quem está logado (só em Em andamento e Em revisão). */
  onToggle?: (task: ProjectTask, running: boolean) => void;
  /** Texto extra na mesma linha quando a tarefa está parada (por exemplo, "Concluída em 3 dias"). */
  trailing?: ReactNode;
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
export function TaskTimer({ onToggle, task, trailing }: TaskTimerProps) {
  const t = useT();
  const { currentProfile } = useCurrentProfile();
  const { labSettings } = useAuth();
  const now = useNow(task.running.length > 0);
  const times = getTaskTimes(task, now);
  const mine = getMyTimer(task, currentProfile?.id);
  const emCurso = (task.status === "in_progress" || task.status === "review") && task.archived_at === null;
  if (times.total === 0 && !emCurso) return null;

  const minhaDuracao = mine ? elapsedSeconds(mine.started_at, now) : 0;
  // Avisa a própria pessoa quando o timer dela passa do tempo de aviso do laboratório (o banco também notifica e pausa sozinho).
  const longo = mine !== null && minhaDuracao >= (labSettings?.timer_reminder_hours ?? 4) * 3600;

  return (
    <div className={["grid gap-1 text-sm", emCurso ? "border-t border-border pt-2" : ""].join(" ")}>
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
        {!emCurso && trailing ? <span className="text-muted">· {trailing}</span> : null}
        {emCurso && times.count > 0 ? (
          <span className="flex items-center gap-1.5 font-semibold text-success-dark">
            <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-success" />
            {t("tasks.workingCount", { count: times.count })}
          </span>
        ) : null}
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
      {longo ? <p className="font-semibold text-warning-dark">{t("tasks.timerLong", { time: formatDuration(minhaDuracao), hours: labSettings?.timer_max_hours ?? 8 })}</p> : null}
    </div>
  );
}
