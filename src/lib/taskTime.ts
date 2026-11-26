// Tempo por pessoa nas tarefas. O banco guarda um registro por trecho em que o cronômetro correu, com quem o ligou
// (`project_task_time_entries`); aqui se soma por pessoa e se monta o relatório.

export type TimeEntry = {
  id: string;
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  phase: "work" | "review";
  started_at: string;
  ended_at: string | null;
  seconds: number | null;
  auto_closed: boolean;
};

export type PersonTime = { profile_id: string; full_name: string; avatar_url: string | null; work: number; review: number; total: number };

function entrySeconds(entry: TimeEntry, now: Date) {
  if (entry.ended_at !== null) return entry.seconds ?? 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(entry.started_at).getTime()) / 1000));
}

// Tempo de cada pessoa na tarefa (trecho aberto conta até `now`) e o tempo guardado sem pessoa: o que foi contado
// antes de existir o registro por pessoa (total fechado da tarefa menos o que os registros explicam).
export function getTimeByPerson(entries: TimeEntry[], task: { work_seconds: number; review_seconds: number }, now: Date) {
  const people = new Map<string, PersonTime>();
  let closedWork = 0;
  let closedReview = 0;
  for (const entry of entries) {
    const seconds = entrySeconds(entry, now);
    const person = people.get(entry.profile_id) ?? {
      profile_id: entry.profile_id,
      full_name: entry.full_name,
      avatar_url: entry.avatar_url,
      work: 0,
      review: 0,
      total: 0,
    };
    if (entry.phase === "review") person.review += seconds;
    else person.work += seconds;
    person.total += seconds;
    people.set(entry.profile_id, person);
    if (entry.ended_at !== null) {
      if (entry.phase === "review") closedReview += seconds;
      else closedWork += seconds;
    }
  }
  const unassigned = {
    work: Math.max(0, task.work_seconds - closedWork),
    review: Math.max(0, task.review_seconds - closedReview),
  };
  return {
    people: [...people.values()].sort((a, b) => b.total - a.total || a.full_name.localeCompare(b.full_name)),
    unassigned: { ...unassigned, total: unassigned.work + unassigned.review },
  };
}

export type TimeReportRow = {
  profile_id: string;
  full_name: string;
  project_id: string;
  project_name: string;
  phase: string;
  seconds: number;
};

// Soma o relatório por pessoa ou por projeto, do maior para o menor tempo.
export function sumTimeReport(rows: TimeReportRow[], by: "person" | "project") {
  const totals = new Map<string, { id: string; name: string; seconds: number }>();
  for (const row of rows) {
    const id = by === "person" ? row.profile_id : row.project_id;
    const entry = totals.get(id) ?? { id, name: by === "person" ? row.full_name : row.project_name, seconds: 0 };
    entry.seconds += row.seconds;
    totals.set(id, entry);
  }
  return [...totals.values()].sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name));
}

// Para gráficos com poucas fatias: mantém os maiores (a lista vem ordenada) e junta o resto numa só.
export function groupSmallest<T extends { id: string; name: string; seconds: number }>(rows: T[], limit: number, othersName: string) {
  if (rows.length <= limit) return rows;
  const rest = rows.slice(limit - 1);
  return [...rows.slice(0, limit - 1), { id: "others", name: othersName, seconds: totalReportSeconds(rest) }];
}

export function totalReportSeconds(rows: Array<{ seconds: number }>) {
  return rows.reduce((sum, row) => sum + row.seconds, 0);
}
