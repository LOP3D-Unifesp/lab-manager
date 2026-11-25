// Cronômetro das tarefas, um por pessoa. O banco guarda os segundos já fechados (trabalho e revisão, de todos) e, para
// cada pessoa com o timer ligado, quando o trecho atual começou; aqui se calcula o que mostrar e o que a tela
// muda antes de o banco responder.

export type RunningTimer = {
  profile_id: string;
  phase: "work" | "review";
  started_at: string;
  full_name: string;
  avatar_url: string | null;
};

export type TaskTimerFields = {
  status: "todo" | "in_progress" | "review" | "done";
  work_seconds: number;
  review_seconds: number;
  /** Quem está com o timer ligado agora. */
  running: RunningTimer[];
};

// Depois de tanto tempo ligado sem parar, o cartão avisa; o banco pausa sozinho aos 12 h.
export const LONG_RUNNING_SECONDS = 8 * 3600;
export const AUTO_PAUSE_HOURS = 12;

export function elapsedSeconds(startedAt: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000));
}

// Tempo da tarefa somando todas as pessoas (horas de trabalho, não relógio de parede).
export function getTaskTimes(task: TaskTimerFields, now: Date) {
  let work = task.work_seconds;
  let review = task.review_seconds;
  for (const timer of task.running) {
    const live = elapsedSeconds(timer.started_at, now);
    if (timer.phase === "review") review += live;
    else work += live;
  }
  return { work, review, total: work + review, running: task.running.length > 0, count: task.running.length };
}

export function getMyTimer(task: Pick<TaskTimerFields, "running">, profileId: string | undefined) {
  return profileId ? (task.running.find((timer) => timer.profile_id === profileId) ?? null) : null;
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes > 0) return `${minutes}min`;
  return `${seconds}s`;
}

// Relógio com segundos (H:MM:SS), para o tempo que está correndo ser visível mexendo.
export function formatClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Person = { profile_id: string; full_name: string; avatar_url: string | null };

// Fecha o trecho de quem NÃO está em `keep` (soma nos totais) e devolve o que sobra correndo.
function closeTimers(task: TaskTimerFields, now: Date, keep: (timer: RunningTimer) => boolean) {
  let work = task.work_seconds;
  let review = task.review_seconds;
  const remaining: RunningTimer[] = [];
  for (const timer of task.running) {
    if (keep(timer)) {
      remaining.push(timer);
      continue;
    }
    const live = elapsedSeconds(timer.started_at, now);
    if (timer.phase === "review") review += live;
    else work += live;
  }
  return { work_seconds: work, review_seconds: review, running: remaining };
}

// Pausar (false) ou retomar (true) o timer de `me`: mesma conta do banco (`set_task_timer`).
export function toggleTaskTimer(task: TaskTimerFields, running: boolean, now: Date, me: Person): Partial<TaskTimerFields> {
  if (task.status !== "in_progress" && task.status !== "review") return {};
  const mine = task.running.some((timer) => timer.profile_id === me.profile_id);
  if (running) {
    if (mine) return {};
    return { running: [...task.running, { ...me, phase: task.status === "review" ? "review" : "work", started_at: now.toISOString() }] };
  }
  if (!mine) return {};
  return closeTimers(task, now, (timer) => timer.profile_id !== me.profile_id);
}

// Mudar de coluna: Em andamento <-> Em revisão mantém quem está trabalhando (na fase nova); A fazer e Finalizado param
// todos. (Quem liga o timer ao entrar em Em andamento é decidido pelo banco; a tela confirma ao recarregar.)
export function getTimerAfterStatusChange(task: TaskTimerFields, status: TaskTimerFields["status"], now: Date): Partial<TaskTimerFields> {
  const closed = closeTimers(task, now, () => false);
  const working = status === "in_progress" || status === "review";
  const wasWorking = task.status === "in_progress" || task.status === "review";
  if (!working || !wasWorking) return { work_seconds: closed.work_seconds, review_seconds: closed.review_seconds, running: [] };
  const phase = status === "review" ? "review" : "work";
  return {
    work_seconds: closed.work_seconds,
    review_seconds: closed.review_seconds,
    running: task.running.map((timer) => ({ ...timer, phase, started_at: now.toISOString() })),
  };
}
