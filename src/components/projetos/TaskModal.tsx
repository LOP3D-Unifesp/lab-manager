import { getLocale, t } from "../../i18n";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  createProjectTask,
  listTaskTimeEntries,
  deleteProjectTask,
  getTaskTotals,
  moveTaskToProject,
  setTaskAssignees,
  setTaskChecklist,
  updateProjectTask,
} from "../../lib/supabaseRepository";
import {
  getTaskErrorMessage,
  isProjectOpen,
  taskPriorityOptions,
  taskStatusOptions,
  type Project,
  type ProjectMember,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "../../lib/projects";
import { formatLeadTime, getLeadTimeSeconds } from "../../lib/taskLeadTime";
import { formatClock, formatDuration, getTaskTimes } from "../../lib/taskTimer";
import { getTimeByPerson, type TimeEntry } from "../../lib/taskTime";
import { useNow } from "./TaskTimer";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { RichTextEditor } from "../ui/RichTextEditor";
import { TimeEntriesList } from "./TimeEntriesList";
import { ChecklistEditor, type ChecklistDraftItem } from "./ChecklistEditor";
import { inputClassName } from "../ui/formStyles";

type TaskModalProps = {
  // Projeto fixo (aba Kanban do projeto): informe também `members`.
  projectId?: string;
  members?: ProjectMember[];
  // Sem projeto fixo (quadro geral e Dashboard): a pessoa escolhe entre estes; ao editar, serve para achar os membros.
  projects?: Project[];
  task: ProjectTask | null;
  defaultStatus?: TaskStatus;
  // Responsáveis sugeridos numa tarefa nova (mantém só quem é membro do projeto escolhido).
  defaultAssigneeIds?: string[];
  canDelete: boolean;
  showProjectLink?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function TaskModal({
  canDelete,
  defaultAssigneeIds = [],
  defaultStatus = "todo",
  members: fixedMembers,
  onClose,
  onSaved,
  projectId: fixedProjectId,
  projects = [],
  showProjectLink = false,
  task,
}: TaskModalProps) {
  // Com a lista de projetos (quadro geral e Dashboard) dá para trocar o projeto de uma tarefa já criada; na página do
  // projeto (sem lista) ele fica fixo.
  const podeTrocarProjeto = Boolean(task) && projects.length > 0 && !fixedMembers;
  const lockedProjectId = podeTrocarProjeto ? null : (task?.project_id ?? fixedProjectId ?? null);
  const [chosenProjectId, setChosenProjectId] = useState(
    lockedProjectId ?? (task ? task.project_id : projects.length === 1 ? projects[0].id : ""),
  );
  const projetosEscolha = task ? projects.filter((item) => isProjectOpen(item.status) || item.id === task.project_id) : projects;
  const projectId = lockedProjectId ?? chosenProjectId;
  const project = projects.find((item) => item.id === projectId);
  const members = fixedMembers ?? project?.members ?? [];

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [dueOn, setDueOn] = useState(task?.due_on ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "normal");
  const [responsaveis, setResponsaveis] = useState<string[]>(() => {
    if (task) return task.assignees.map((a) => a.profile_id);
    const initialMembers = fixedMembers ?? (projects.length === 1 ? projects[0].members : []);
    return defaultAssigneeIds.filter((id) => initialMembers.some((member) => member.profile_id === id));
  });
  const itensIniciais = (task?.checklist ?? []).map(({ id, title, done }) => ({ id, title, done }));
  const [checklist, setChecklist] = useState<ChecklistDraftItem[]>(itensIniciais);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [trechos, setTrechos] = useState<TimeEntry[]>([]);
  const [totais, setTotais] = useState({ work: task?.work_seconds ?? 0, review: task?.review_seconds ?? 0 });

  // Tempo por pessoa: lê os trechos de tempo e os totais da tarefa ao abrir (e de novo depois de um ajuste ou se
  // alguém ligar/pausar o timer enquanto o modal está aberto).
  const taskId = task?.id;
  const cronometro = task ? task.running.map((item) => item.profile_id).join(",") + `:${task.work_seconds}:${task.review_seconds}` : "";
  useEffect(() => {
    if (!taskId) return;
    let ativo = true;
    Promise.all([listTaskTimeEntries(taskId), getTaskTotals(taskId)])
      .then(([lista, soma]) => {
        if (!ativo) return;
        setTrechos(lista);
        setTotais({ work: soma.work_seconds, review: soma.review_seconds });
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [taskId, cronometro]);

  function escolherProjeto(id: string) {
    setChosenProjectId(id);
    const novoMembros = projects.find((item) => item.id === id)?.members ?? [];
    // Tarefa nova: sugere os responsáveis padrão; tarefa existente: mantém quem também é membro do novo projeto.
    const base = task ? responsaveis : defaultAssigneeIds;
    setResponsaveis(base.filter((memberId) => novoMembros.some((member) => member.profile_id === memberId)));
  }

  function alternar(profileId: string) {
    setResponsaveis((current) =>
      current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId],
    );
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!projectId) {
      setErro(t("taskModal.errProject"));
      return;
    }
    if (!trimmed) {
      setErro(t("taskModal.errTitle"));
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      const base = { title: trimmed, description: description.trim() || null, due_on: dueOn || null, priority };
      let taskId: string;
      if (task) {
        if (projectId !== task.project_id) await moveTaskToProject(task.id, projectId);
        // Ao mudar de coluna, o banco coloca a tarefa no fim da nova coluna.
        await updateProjectTask(task.id, { ...base, status });
        taskId = task.id;
      } else {
        taskId = await createProjectTask(projectId, { ...base, status });
      }
      await setTaskAssignees(taskId, responsaveis);
      const itens = checklist.map((item) => ({ ...item, title: item.title.trim() })).filter((item) => item.title);
      if (JSON.stringify(itens) !== JSON.stringify(itensIniciais)) await setTaskChecklist(taskId, itens);
      onSaved();
    } catch (error) {
      setErro(getTaskErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!task) return;
    setConfirmandoExclusao(false);
    try {
      setSalvando(true);
      await deleteProjectTask(task.id);
      onSaved();
    } catch (error) {
      setErro(getTaskErrorMessage(error));
      setSalvando(false);
    }
  }

  const trechosAbertos = trechos.filter((trecho) => trecho.ended_at === null);
  const agora = useNow(trechosAbertos.length > 0);
  const tempos = task
    ? getTaskTimes(
        {
          status: task.status,
          work_seconds: totais.work,
          review_seconds: totais.review,
          running: trechosAbertos.map((trecho) => ({ profile_id: trecho.profile_id, phase: trecho.phase, started_at: trecho.started_at, full_name: trecho.full_name, avatar_url: trecho.avatar_url })),
        },
        agora,
      )
    : null;
  const porPessoa = task ? getTimeByPerson(trechos, { work_seconds: totais.work, review_seconds: totais.review }, agora) : null;
  const mostrar = (segundos: number) => (tempos?.running ? formatClock(segundos) : formatDuration(segundos));
  const formatarData = (valor: string) => new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(valor));
  const semProjetos = !lockedProjectId && projects.length === 0;

  return (
    <Modal title={task ? t("taskModal.edit") : t("taskModal.new")} onClose={onClose}>
      <form className="grid gap-4" onSubmit={salvar}>
        {lockedProjectId ? (
          showProjectLink && task ? (
            <p className="text-base text-muted">
              {t("taskModal.projectLabel")}{" "}
              <Link className="font-semibold text-primary underline" to={`/projetos/${lockedProjectId}`} onClick={onClose}>
                {task.project_name ?? project?.name ?? t("taskModal.openProject")}
              </Link>
            </p>
          ) : null
        ) : (
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("taskModal.project")}
            <select
              className={inputClassName}
              required
              disabled={semProjetos}
              value={chosenProjectId}
              onChange={(e) => escolherProjeto(e.target.value)}
            >
              <option value="" disabled>
                {semProjetos ? t("taskModal.noOpenProject") : t("taskModal.select")}
              </option>
              {projetosEscolha.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="grid gap-2 text-base font-semibold text-text">
          {t("taskModal.title")}
          <input className={inputClassName} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <RichTextEditor label={t("taskModal.description")} value={description} onChange={setDescription} />
        <ChecklistEditor items={checklist} onChange={setChecklist} />
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("taskModal.column")}
            <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {taskStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("taskModal.due")}
            <input className={inputClassName} type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("taskModal.priority")}
            <select className={inputClassName} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {taskPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {task ? (
          <p className="text-sm text-muted">
            {t("tasks.createdOn", { date: formatarData(task.created_at) })}
            {task.completed_at
              ? ` · ${t("tasks.completedOn", { date: formatarData(task.completed_at), time: formatLeadTime(getLeadTimeSeconds(task) ?? 0) })}`
              : ""}
          </p>
        ) : null}

        {task && tempos && tempos.total > 0 ? (
          <p className="rounded-lg border border-border bg-background p-3 text-base text-text">
            <span className="font-semibold"><span className="tabular-nums">{t("tasks.timeTotal")}: {mostrar(tempos.total)}</span></span>
            <span className="text-muted">
              {" "}
              · {t("tasks.timeWork")} {mostrar(tempos.work)} · {t("tasks.timeReview")} {mostrar(tempos.review)}
            </span>
          </p>
        ) : null}

        {porPessoa && (porPessoa.people.length > 0 || porPessoa.unassigned.total > 0) ? (
          <div className="grid gap-2">
            <p className="text-base font-semibold text-text">{t("tasks.timeByPerson")}</p>
            <ul className="grid gap-2">
              {porPessoa.people.map((pessoa) => (
                <li key={pessoa.profile_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2">
                  <Avatar avatarUrl={pessoa.avatar_url} name={pessoa.full_name} className="h-8 w-8 shrink-0" />
                  <span className="min-w-[8rem] flex-1 truncate text-base font-semibold text-text">{pessoa.full_name}</span>
                  <span className="w-full text-sm tabular-nums text-muted sm:w-auto sm:text-right">
                    <span className="font-semibold text-text">{mostrar(pessoa.total)}</span>
                    {pessoa.review > 0 ? (
                      <>
                        {" "}
                        · {t("tasks.timeWork")} {mostrar(pessoa.work)} · {t("tasks.timeReview")} {mostrar(pessoa.review)}
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
              {porPessoa.unassigned.total > 0 ? (
                <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">
                  <span>{t("tasks.timeUnassigned")}</span>
                  <span className="tabular-nums">{formatDuration(porPessoa.unassigned.total)}</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {task ? (
          <TimeEntriesList entries={trechos} now={agora} />
        ) : null}

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-base font-semibold text-text">{t("taskModal.assignees")}</legend>
          {!projectId ? (
            <p className="text-base text-muted">{t("taskModal.pickProject")}</p>
          ) : members.length === 0 ? (
            <p className="text-base text-muted">{t("taskModal.addMembers")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((member) => {
                const selecionado = responsaveis.includes(member.profile_id);
                return (
                  <label
                    key={member.profile_id}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-base font-semibold transition",
                      selecionado
                        ? "border-primary bg-primary-soft text-primary-dark"
                        : "border-border bg-surface text-text hover:border-primary",
                    ].join(" ")}
                  >
                    <input
                      checked={selecionado}
                      className="h-4 w-4 accent-primary"
                      type="checkbox"
                      onChange={() => alternar(member.profile_id)}
                    />
                    <Avatar avatarUrl={member.avatar_url} name={member.full_name} className="h-8 w-8" />
                    <span className="min-w-0 truncate">{member.full_name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {task && canDelete ? (
              <Button variant="danger" disabled={salvando} onClick={() => setConfirmandoExclusao(true)}>
                {t("taskModal.delete")}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={salvando || semProjetos}>
              {salvando ? t("common.saving") : t("taskModal.save")}
            </Button>
          </div>
        </div>
      </form>
      {confirmandoExclusao && task ? (
        <ConfirmDialog confirmLabel={t("tasks.deleteConfirmButton")} busy={salvando} onCancel={() => setConfirmandoExclusao(false)} onConfirm={excluir} title={t("tasks.deleteTitle")}>
          <p className="font-semibold">{task.title}</p>
          <p className="mt-2 text-muted">{t("tasks.deleteWarning")}</p>
        </ConfirmDialog>
      ) : null}
    </Modal>
  );
}
