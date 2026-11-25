import { t } from "../../i18n";
import { taskPriorityOptions, type Project, type TaskFilters } from "../../lib/projects";

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

type TaskFilterBarProps = {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  /** Projetos para o seletor; sem a lista, o filtro de projeto não aparece. */
  projects?: Project[];
  /** Responsáveis para o seletor; sem a lista, o filtro de responsável não aparece. */
  assignees?: Array<{ profile_id: string; full_name: string }>;
  profileId: string;
};

function Toggle({ checked, danger = false, label, onChange }: { checked: boolean; danger?: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label
      className={[
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-base font-semibold transition",
        checked ? (danger ? "border-danger bg-danger-soft text-danger-dark" : "border-primary bg-primary-soft text-primary-dark") : "border-border bg-surface text-text",
      ].join(" ")}
    >
      <input checked={checked} className="h-4 w-4 accent-primary" type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

// Filtros dos quadros de tarefas: o quadro geral usa todos; a Início, só os que fazem sentido para as tarefas da pessoa.
export function TaskFilterBar({ assignees, filters, onChange, profileId, projects }: TaskFilterBarProps) {
  const set = (patch: Partial<TaskFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {projects ? (
        <select aria-label={t("tasks.filterProject")} className={`${selectClassName} min-w-44 flex-1`} value={filters.projectId} onChange={(event) => set({ projectId: event.target.value })}>
          <option value="all">{t("tasks.allProjects")}</option>
          {projects.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.name}
            </option>
          ))}
        </select>
      ) : null}
      {assignees ? (
        <select aria-label={t("tasks.filterAssignee")} className={`${selectClassName} min-w-44 flex-1`} value={filters.assignee} onChange={(event) => set({ assignee: event.target.value })}>
          <option value="all">{t("tasks.allAssignees")}</option>
          <option value="me">{t("tasks.onlyMine")}</option>
          {assignees
            .filter((pessoa) => pessoa.profile_id !== profileId)
            .map((pessoa) => (
              <option key={pessoa.profile_id} value={pessoa.profile_id}>
                {pessoa.full_name}
              </option>
            ))}
        </select>
      ) : null}
      <select
        aria-label={t("tasks.filterPriority")}
        className={`${selectClassName} min-w-44 flex-1`}
        value={filters.priority}
        onChange={(event) => set({ priority: event.target.value as TaskFilters["priority"] })}
      >
        <option value="all">{t("tasks.allPriorities")}</option>
        {taskPriorityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Toggle checked={filters.overdueOnly} danger label={t("tasks.onlyLate")} onChange={(overdueOnly) => set({ overdueOnly })} />
      <Toggle checked={filters.showArchived} label={t("tasks.showArchived")} onChange={(showArchived) => set({ showArchived })} />
    </div>
  );
}
