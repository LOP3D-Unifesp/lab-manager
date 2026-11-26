import { getLocale, t } from "../../i18n";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
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
import { useAutoSave } from "./useAutoSave";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Modal } from "../ui/Modal";
import { RichTextEditor } from "../ui/RichTextEditor";
import { TimeEntriesList } from "./TimeEntriesList";
import { ChecklistEditor, type ChecklistDraftItem } from "./ChecklistEditor";
import { TaskComments, type TaskCommentsHandle } from "./TaskComments";
import { Tabs } from "../ui/Tabs";
import { inputClassName } from "../ui/formStyles";

export type TaskModalTab = "details" | "comments" | "time";

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
  /** Aba aberta de início (um aviso de comentário abre direto nos comentários). */
  initialTab?: TaskModalTab;
  onClose: () => void;
  onSaved: () => void;
};

// Itens prontos para gravar: sem espaços nas pontas; um título esvaziado mantém o que estava gravado, e itens sem
// título nenhum ficam de fora.
function normalizarChecklist(itens: ChecklistDraftItem[], gravados: ChecklistDraftItem[]) {
  return itens
    .map((item) => ({ ...item, title: item.title.trim() || (gravados.find((saved) => saved.id === item.id)?.title ?? "") }))
    .filter((item) => item.title);
}

export function TaskModal({
  canDelete,
  defaultAssigneeIds = [],
  defaultStatus = "todo",
  members: fixedMembers,
  onClose,
  onSaved,
  projectId: fixedProjectId,
  initialTab = "details",
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
  // O que já está no banco, atualizado a cada gravação.
  const checklistGravada = useRef<ChecklistDraftItem[]>(itensIniciais);
  const responsaveisGravados = useRef<string[]>(task?.assignees.map((a) => a.profile_id) ?? []);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [trechos, setTrechos] = useState<TimeEntry[]>([]);
  const [totais, setTotais] = useState({ work: task?.work_seconds ?? 0, review: task?.review_seconds ?? 0 });
  const [descricaoEditada, setDescricaoEditada] = useState(false);
  // Numa tarefa já criada, tudo menos título, descrição e projeto é gravado na hora.
  const auto = useAutoSave((error) => setErro(getTaskErrorMessage(error)));
  const formId = useId();
  const comentariosRef = useRef<TaskCommentsHandle>(null);
  const comentou = useRef(false);
  const [comentarioPendente, setComentarioPendente] = useState(false);
  const [aba, setAba] = useState<TaskModalTab>(initialTab);
  const [totalComentarios, setTotalComentarios] = useState(task?.comment_count ?? 0);

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
    // Voltou ao projeto da tarefa: voltam os responsáveis dela.
    if (task && id === task.project_id) {
      setResponsaveis(responsaveisGravados.current);
      return;
    }
    const novoMembros = projects.find((item) => item.id === id)?.members ?? [];
    // Tarefa nova: sugere os responsáveis padrão; tarefa existente: mantém quem também é membro do novo projeto.
    const base = task ? responsaveis : defaultAssigneeIds;
    setResponsaveis(base.filter((memberId) => novoMembros.some((member) => member.profile_id === memberId)));
  }

  function alternar(profileId: string) {
    const novos = responsaveis.includes(profileId) ? responsaveis.filter((id) => id !== profileId) : [...responsaveis, profileId];
    setResponsaveis(novos);
    // Com a troca de projeto ainda não salva, os responsáveis vão junto no Salvar.
    if (task && projectId === task.project_id) {
      auto.now("assignees", async () => {
        await setTaskAssignees(task.id, novos);
        responsaveisGravados.current = novos;
      });
    }
  }

  function mudarColuna(value: TaskStatus) {
    setStatus(value);
    if (task) auto.now("status", () => updateProjectTask(task.id, { status: value }));
  }

  function mudarPrioridade(value: TaskPriority) {
    setPriority(value);
    if (task) auto.now("priority", () => updateProjectTask(task.id, { priority: value }));
  }

  function mudarPrazo(value: string) {
    setDueOn(value);
    // Enquanto o ano é digitado o campo passa por valores como 0002: só grava datas completas.
    if (task && (value === "" || /^[2-9]\d{3}-/.test(value))) auto.later("due", () => updateProjectTask(task.id, { due_on: value || null }));
    else auto.drop("due");
  }

  function mudarChecklist(itens: ChecklistDraftItem[]) {
    setChecklist(itens);
    if (!task) return;
    // Título apagado por enquanto mantém o anterior; remover é pelo X.
    const gravar = normalizarChecklist(itens, checklistGravada.current);
    auto.later("checklist", async () => {
      await setTaskChecklist(task.id, gravar);
      checklistGravada.current = gravar;
    });
  }

  const textoPendente = Boolean(
    task &&
      (title.trim() !== task.title ||
        (descricaoEditada && description.trim() !== (task.description ?? "").trim()) ||
        projectId !== task.project_id),
  );
  const rascunhoNovo = Boolean(
    !task && (title.trim() || (descricaoEditada && description.trim()) || checklist.length > 0 || dueOn || priority !== "normal"),
  );
  const naoSalvo = textoPendente || rascunhoNovo || comentarioPendente || auto.failed;

  // Fecha depois de gravar o que estiver na fila; se algo mudou no banco, o quadro recarrega.
  async function encerrar() {
    const jaTinhaFalha = auto.hasFailed();
    await auto.flush();
    // Uma falha que só apareceu agora mantém a janela aberta, com o erro à vista; fechar de novo pergunta antes.
    if (!jaTinhaFalha && auto.hasFailed()) return;
    if (auto.hasSaved() || comentou.current) onSaved();
    else onClose();
  }

  async function salvar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = title.trim();
    if (!projectId || !trimmed) {
      // Os campos que faltam ficam na primeira aba.
      setAba("details");
      setErro(t(projectId ? "taskModal.errTitle" : "taskModal.errProject"));
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      // O que ainda esperava para ser gravado vai junto neste salvamento.
      await auto.flush();
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
      const itens = normalizarChecklist(checklist, checklistGravada.current);
      if (JSON.stringify(itens) !== JSON.stringify(checklistGravada.current)) await setTaskChecklist(taskId, itens);
      // Um comentário digitado e não enviado vai junto, para não se perder ao fechar.
      await comentariosRef.current?.flush(projectId, members);
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
      auto.cancel();
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

  // Tarefa nova não tem abas: só os detalhes.
  const painel = (id: TaskModalTab) =>
    task ? { id: `${formId}-panel-${id}`, role: "tabpanel", "aria-labelledby": `${formId}-tab-${id}`, hidden: aba !== id } : {};
  const temTempo = Boolean((tempos && tempos.total > 0) || trechos.length > 0);

  const aviso = auto.status === "saving" ? t("common.saving") : auto.status === "saved" ? t("taskModal.autoSaved") : "";

  return (
    <Modal
      title={task ? t("taskModal.edit") : t("taskModal.new")}
      description={task ? <span role="status" className="block min-h-5 text-sm">{aviso}</span> : undefined}
      headerActions={
        <Button className="min-h-10 px-4 py-2 text-base" type="submit" form={formId} disabled={salvando || semProjetos}>
          {salvando ? t("common.saving") : t("common.save")}
        </Button>
      }
      headerTabs={
        task ? (
          <Tabs
            idBase={formId}
            label={t("taskModal.tabs")}
            value={aba}
            onChange={setAba}
            tabs={[
              { id: "details", label: t("taskModal.tabDetails") },
              { id: "comments", label: totalComentarios > 0 ? `${t("comments.title")} (${totalComentarios})` : t("comments.title") },
              { id: "time", label: t("taskModal.tabTime") },
            ]}
          />
        ) : undefined
      }
      trackInputs={false}
      unsaved={naoSalvo}
      onSave={() => void salvar()}
      onClose={() => void encerrar()}
    >
      {erro ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}
      {/* As abas só escondem: o que foi digitado em cada uma continua lá. Sem a validação do navegador, que não
          consegue apontar um campo escondido (salvar confere título e projeto). */}
      <div {...painel("details")}>
        <form id={formId} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4" onSubmit={salvar}>
          {task ? <p className="text-sm text-muted">{t("taskModal.autoHint")}</p> : null}
          {lockedProjectId ? (
            showProjectLink && task ? (
              <p className="text-base text-muted">
                {t("taskModal.projectLabel")}{" "}
                <Link
                  className="font-semibold text-primary underline"
                  to={`/projetos/${lockedProjectId}`}
                  onClick={(event) => {
                    // Com texto não salvo, não sai da tela.
                    if (naoSalvo) {
                      event.preventDefault();
                      setErro(t("taskModal.saveBeforeLeaving"));
                    } else void encerrar();
                  }}
                >
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
          <div onInput={() => setDescricaoEditada(true)}>
            <RichTextEditor label={t("taskModal.description")} value={description} onChange={setDescription} />
          </div>
          <ChecklistEditor items={checklist} onChange={mudarChecklist} />
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-base font-semibold text-text">
              {t("taskModal.column")}
              <select className={inputClassName} value={status} onChange={(e) => mudarColuna(e.target.value as TaskStatus)}>
                {taskStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-base font-semibold text-text">
              {t("taskModal.due")}
              <input className={inputClassName} type="date" value={dueOn} onChange={(e) => mudarPrazo(e.target.value)} />
            </label>
            <label className="grid gap-2 text-base font-semibold text-text">
              {t("taskModal.priority")}
              <select className={inputClassName} value={priority} onChange={(e) => mudarPrioridade(e.target.value as TaskPriority)}>
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

          <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
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
        </form>
        {task && canDelete ? (
          <div className="mt-6 border-t border-border pt-4">
            <Button variant="danger" disabled={salvando} onClick={() => setConfirmandoExclusao(true)}>
              {t("taskModal.delete")}
            </Button>
          </div>
        ) : null}
      </div>
      {task ? (
        <>
          {/* Fora do formulário: comentar não salva a tarefa. Com a troca de projeto ainda não salva, valem o projeto e
              os membros atuais. */}
          <div {...painel("comments")}>
            <TaskComments
              ref={comentariosRef}
              taskId={task.id}
              projectId={task.project_id}
              members={fixedMembers ?? projects.find((item) => item.id === task.project_id)?.members ?? []}
              onPendingChange={setComentarioPendente}
              onCountChange={setTotalComentarios}
              onChanged={() => {
                comentou.current = true;
              }}
            />
          </div>
          <div {...painel("time")}>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
              {temTempo ? null : <p className="text-base text-muted">{t("taskModal.noTime")}</p>}
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
            </div>
          </div>
        </>
      ) : null}
      {confirmandoExclusao && task ? (
        <ConfirmDialog confirmLabel={t("tasks.deleteConfirmButton")} busy={salvando} onCancel={() => setConfirmandoExclusao(false)} onConfirm={excluir} title={t("tasks.deleteTitle")}>
          <p className="font-semibold">{task.title}</p>
          <p className="mt-2 text-muted">{t("tasks.deleteWarning")}</p>
        </ConfirmDialog>
      ) : null}
    </Modal>
  );
}
