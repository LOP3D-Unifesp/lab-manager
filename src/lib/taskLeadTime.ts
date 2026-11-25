import { t } from "../i18n";

// Tempo até concluir a tarefa: da criação até entrar em Finalizado. Não depende do cronômetro.
export type LeadTimeFields = { created_at: string; completed_at: string | null };

export function getLeadTimeSeconds(task: LeadTimeFields): number | null {
  if (!task.completed_at) return null;
  return Math.max(0, Math.floor((new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()) / 1000));
}

export function formatLeadTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("lead.minutes", { count: Math.max(1, minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("lead.hours", { count: hours });
  const days = Math.floor(hours / 24);
  return t(days === 1 ? "lead.day" : "lead.days", { count: days });
}

// Média (em segundos) das tarefas concluídas no período [from, to); null se não houver nenhuma.
export function averageLeadTime(tasks: LeadTimeFields[], range?: { from: Date; to: Date }) {
  const values = tasks
    .filter((task) => !range || (task.completed_at !== null && new Date(task.completed_at) >= range.from && new Date(task.completed_at) < range.to))
    .map(getLeadTimeSeconds)
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
