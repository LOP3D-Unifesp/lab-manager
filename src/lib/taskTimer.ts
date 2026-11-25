// Cronômetro das tarefas. O banco guarda os segundos já fechados (trabalho e revisão) e, se estiver correndo, quando o
// trecho atual começou; aqui se calcula o que mostrar e o que a tela muda antes de o banco responder.

export type TaskTimerFields = {
  status: "todo" | "in_progress" | "review" | "done";
  work_seconds: number;
  review_seconds: number;
  timer_phase: "work" | "review" | null;
  timer_started_at: string | null;
};

// Depois de tanto tempo correndo sem parar, o cartão avisa (sem pausar sozinho).
export const LONG_RUNNING_SECONDS = 8 * 3600;

function runningSeconds(task: Pick<TaskTimerFields, "timer_started_at">, now: Date) {
  if (!task.timer_started_at) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(task.timer_started_at).getTime()) / 1000));
}

export function getTaskTimes(task: TaskTimerFields, now: Date) {
  const running = task.timer_started_at !== null;
  const live = runningSeconds(task, now);
  const work = task.work_seconds + (running && task.timer_phase !== "review" ? live : 0);
  const review = task.review_seconds + (running && task.timer_phase === "review" ? live : 0);
  return { work, review, total: work + review, running, runningFor: live };
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes > 0) return `${minutes}min`;
  return `${seconds}s`;
}

// Pausar (false) ou retomar (true): mesma conta do banco (`set_task_timer`).
export function toggleTaskTimer(task: TaskTimerFields, running: boolean, now: Date): Partial<TaskTimerFields> {
  if (task.status !== "in_progress" && task.status !== "review") return {};
  if (running) {
    if (task.timer_started_at) return {};
    return { timer_started_at: now.toISOString(), timer_phase: task.status === "review" ? "review" : "work" };
  }
  if (!task.timer_started_at) return {};
  const times = getTaskTimes(task, now);
  return { work_seconds: times.work, review_seconds: times.review, timer_started_at: null };
}

// Mudar de coluna: fecha o trecho que corria e liga o da nova coluna (Em andamento = trabalho, Em revisão = revisão).
export function getTimerAfterStatusChange(task: TaskTimerFields, status: TaskTimerFields["status"], now: Date): Partial<TaskTimerFields> {
  const times = getTaskTimes(task, now);
  const closed = { work_seconds: times.work, review_seconds: times.review };
  if (status === "in_progress") return { ...closed, timer_phase: "work", timer_started_at: now.toISOString() };
  if (status === "review") return { ...closed, timer_phase: "review", timer_started_at: now.toISOString() };
  return { ...closed, timer_phase: null, timer_started_at: null };
}
