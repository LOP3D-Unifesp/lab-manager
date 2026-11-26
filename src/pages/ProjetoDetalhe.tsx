import { useT } from "../i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus } from "lucide-react";

import { FundingEditor, fundingFormToInput, fundingToForm, type FundingForm } from "../components/projetos/FundingEditor";
import { KanbanBoard } from "../components/projetos/KanbanBoard";
import { JoinRequestsPanel } from "../components/projetos/JoinRequestsPanel";
import { ProjectSummaryView } from "../components/projetos/ProjectSummaryView";
import { SpoolCard } from "../components/inventario/SpoolCard";
import { MembersEditor } from "../components/projetos/MembersEditor";
import { ProjectFormModal } from "../components/projetos/ProjectFormModal";
import { TaskFilterBar } from "../components/projetos/TaskFilterBar";
import { TaskModal } from "../components/projetos/TaskModal";
import { useTaskBoard } from "../components/projetos/useTaskBoard";
import { useTaskSort } from "../components/projetos/useTaskSort";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import type { PublicProfile } from "../lib/domain";
import { formatAmount, type MaterialSpool, type MaterialUnit } from "../lib/inventory";
import {
  formatCurrencyBRL,
  formatProjectPeriod,
  getFundingCategoryLabel,
  getFundingTotal,
  emptyTaskFilters,
  filterTasks,
  hasActiveTaskFilters,
  getProjectErrorMessage,
  getProjectFundingTotal,
  getProjectStatusLabel,
  getProjectStatusVariant,
  getTaskErrorMessage,
  type FundingAgencyRecord,
  type Project,
  type ProjectDirectoryEntry,
  type ProjectTask,
  type TaskFilters,
  type TaskStatus,
} from "../lib/projects";
import {
  getProject,
  getProjectDirectoryEntry,
  listFundingAgencies,
  listProfiles,
  listProjectConsumption,
  listProjectTasks,
  listSpools,
  replaceProjectFunding,
  replaceProjectMembers,
} from "../lib/supabaseRepository";

type Aba = "geral" | "kanban" | "insumos" | "membros" | "fomento";

const abas: Array<{ id: Aba; label: string }> = [
  { id: "geral", label: "projects.tabOverview" },
  { id: "kanban", label: "projects.tabKanban" },
  { id: "insumos", label: "projects.tabSupplies" },
  { id: "membros", label: "projects.tabMembers" },
  { id: "fomento", label: "projects.tabFunding" },
];

export function ProjetoDetalhe() {
  const t = useT();
  const { id = "" } = useParams();
  const { profile } = useAuth();
  const isCoordinator = profile?.role === "coordinator";
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  // Quem não participa do projeto vê só o resumo (e pode pedir para entrar).
  const [resumo, setResumo] = useState<ProjectDirectoryEntry | null>(null);
  const [aba, setAba] = useState<Aba>("geral");
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [agencies, setAgencies] = useState<FundingAgencyRecord[]>([]);
  const [membrosForm, setMembrosForm] = useState<string[]>([]);
  const [fomentoForm, setFomentoForm] = useState<FundingForm[]>([]);
  const [filtrosTarefas, setFiltrosTarefas] = useState<TaskFilters>(emptyTaskFilters);
  const [rolos, setRolos] = useState<MaterialSpool[] | null>(null);
  const [consumo, setConsumo] = useState<Array<{ name: string; unit: MaterialUnit; total: number }>>([]);
  const [tarefaAberta, setTarefaAberta] = useState<{ task: ProjectTask | null; status: TaskStatus; comentarios?: boolean } | null>(null);
  // Link de um aviso de comentário: /projetos/<id>?tarefa=<id da tarefa>.
  const [searchParams, setSearchParams] = useSearchParams();
  const tarefaDoLink = searchParams.get("tarefa");

  const carregadorTarefas = useCallback(() => listProjectTasks(id), [id]);
  const quadro = useTaskBoard(carregadorTarefas);
  const [ordemTarefas, setOrdemTarefas] = useTaskSort();
  const tarefas = quadro.tarefas ?? [];
  const carregarTarefas = quadro.recarregar;
  const tarefasVisiveis = useMemo(() => {
    const now = new Date();
    const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return filterTasks(tarefas, filtrosTarefas, profile?.id ?? null, hoje);
  }, [tarefas, filtrosTarefas, profile?.id]);

  // Abre a tarefa do link assim que ela estiver carregada e limpa o endereço, para não reabrir depois de fechada.
  useEffect(() => {
    if (!tarefaDoLink) return;
    const task = quadro.tarefas?.find((item) => item.id === tarefaDoLink);
    if (!task) return;
    setAba("kanban");
    setTarefaAberta({ task, status: task.status, comentarios: true });
    setSearchParams(
      (params) => {
        params.delete("tarefa");
        return params;
      },
      { replace: true },
    );
  }, [tarefaDoLink, quadro.tarefas, setSearchParams]);

  const carregar = useCallback(async () => {
    const data = await getProject(id);
    setProject(data);
    setResumo(data ? null : await getProjectDirectoryEntry(id));
    if (data) {
      setMembrosForm(data.members.map((member) => member.profile_id));
      setFomentoForm(fundingToForm(data.funding));
      await carregarTarefas();
    }
  }, [id, carregarTarefas]);

  useEffect(() => {
    let ativo = true;
    carregar().catch((error) => {
      if (ativo) {
        setProject(null);
        setErro(getProjectErrorMessage(error));
      }
    });
    return () => {
      ativo = false;
    };
  }, [carregar]);

  useEffect(() => {
    if (aba !== "insumos" || rolos !== null) return;
    let ativo = true;
    Promise.all([listSpools(), listProjectConsumption(id)])
      .then(([todos, totais]) => {
        if (!ativo) return;
        setRolos(todos.filter((item) => item.project_id === id));
        setConsumo(totais);
      })
      .catch((error) => ativo && setErro(getProjectErrorMessage(error)));
    return () => {
      ativo = false;
    };
  }, [aba, id, rolos]);

  useEffect(() => {
    if (!isCoordinator) return;
    let ativo = true;
    Promise.all([listProfiles(), listFundingAgencies()])
      .then(([people, agencyList]) => {
        if (!ativo) return;
        setProfiles(people);
        setAgencies(agencyList);
      })
      .catch((error) => ativo && setErro(getProjectErrorMessage(error)));
    return () => {
      ativo = false;
    };
  }, [isCoordinator]);

  async function salvarMembros() {
    try {
      setSalvando(true);
      setErro("");
      setAviso("");
      await replaceProjectMembers(id, membrosForm);
      await carregar();
      setAviso(t("projects.membersUpdated"));
    } catch (error) {
      setErro(getProjectErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFomento() {
    const input = fundingFormToInput(fomentoForm);
    if (typeof input === "string") {
      setErro(input);
      return;
    }
    try {
      setSalvando(true);
      setErro("");
      setAviso("");
      await replaceProjectFunding(id, input);
      await carregar();
      setAviso(t("projects.fundingUpdated"));
    } catch (error) {
      setErro(getProjectErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  if (project === undefined) {
    return <p className="text-lg text-muted">{t("projects.loadingOne")}</p>;
  }

  if (project === null && resumo) {
    return <ProjectSummaryView entry={resumo} onChanged={carregar} />;
  }

  if (project === null) {
    return (
      <Card>
        <p className="text-lg font-semibold">{t("projects.notFound")}</p>
        <p className="mt-1 text-muted">{t("projects.notFoundHint")}</p>
        <Link className="mt-3 inline-block font-semibold text-primary underline" to="/projetos">
          {t("projects.backToProjects")}
        </Link>
      </Card>
    );
  }

  const periodo = formatProjectPeriod(project.starts_on, project.ends_on);

  return (
    <>
      <Link className="mb-3 inline-flex items-center gap-2 font-semibold text-primary" to="/projetos">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("projects.title")}
      </Link>
      <PageHeader
        title={project.name}
        description={project.description ?? t("projects.noDescription")}
        action={
          isCoordinator ? (
            <Button variant="secondary" onClick={() => setEditando(true)}>
              <Pencil className="mr-2 h-5 w-5" aria-hidden="true" />
              {t("projects.edit")}
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" className="mb-5 flex gap-2 overflow-x-auto overflow-y-hidden border-b border-border">
        {abas.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={aba === item.id}
            className={[
              "whitespace-nowrap border-b-2 px-4 py-3 text-base font-semibold transition",
              aba === item.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-text",
            ].join(" ")}
            onClick={() => {
              setAba(item.id);
              setErro("");
              setAviso("");
            }}
          >
            {t(item.label as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {erro ? (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}
      {aviso ? (
        <p className="mb-4 rounded-lg border border-success bg-success-soft p-3 text-base font-semibold text-success-dark">{aviso}</p>
      ) : null}

      {aba === "geral" ? (
        <Card>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold text-muted">{t("projects.status")}</dt>
              <dd className="mt-1">
                <StatusBadge label={getProjectStatusLabel(project.status)} variant={getProjectStatusVariant(project.status)} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">{t("projects.period")}</dt>
              <dd className="mt-1 font-bold">{periodo ?? t("common.notInformed")}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">{t("projects.members")}</dt>
              <dd className="mt-1 font-bold">{project.members.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">{t("projects.funding")}</dt>
              <dd className="mt-1 font-bold">
                {project.funding.length === 0
                  ? t("projects.fundingNo")
                  : `${project.funding.map((entry) => entry.agency_acronym).join(", ")} — ${formatCurrencyBRL(getProjectFundingTotal(project))}`}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {aba === "geral" ? <JoinRequestsPanel projectId={id} onDecided={carregar} /> : null}

      {aba === "kanban" ? (
        <div className="grid gap-4">
          <div className="flex justify-end">
            <Button onClick={() => setTarefaAberta({ task: null, status: "todo" })}>
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              {t("projects.newTask")}
            </Button>
          </div>
          <TaskFilterBar sort={ordemTarefas} onSortChange={setOrdemTarefas} filters={filtrosTarefas} onChange={setFiltrosTarefas} profileId={profile?.id ?? ""} />
          {quadro.erro ? (
            <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{quadro.erro}</p>
          ) : null}
          {hasActiveTaskFilters(filtrosTarefas) ? (
            <div className="flex items-center justify-between gap-3 text-base text-muted">
              <span>
                {t("tasks.countOf", {
                  shown: tarefasVisiveis.length,
                  total: filtrosTarefas.showArchived ? tarefas.length : tarefas.filter((task) => !task.archived_at).length,
                })}
              </span>
              <button type="button" className="font-semibold text-primary underline" onClick={() => setFiltrosTarefas(emptyTaskFilters)}>
                {t("tasks.clearFilters")}
              </button>
            </div>
          ) : null}
          <KanbanBoard
            sort={ordemTarefas}
            tasks={tarefasVisiveis}
            canDelete={(task) => Boolean(isCoordinator) || task.created_by === profile?.id}
            onArchive={quadro.arquivar}
            onDelete={quadro.apagar}
            onDragChange={quadro.arrastar}
            onMove={quadro.mover}
            onToggleChecklistItem={quadro.marcarItem}
            onToggleTimer={quadro.alternarCronometro}
            onPriorityChange={quadro.mudarPrioridade}
            onOpen={(task) => setTarefaAberta({ task, status: task.status })}
          />
        </div>
      ) : null}

      {aba === "insumos" ? (
        <div className="grid gap-4">
          {consumo.length > 0 ? (
            <Card>
              <h3 className="text-xl font-bold text-text">{t("projects.consumed")}</h3>
              <ul className="mt-3 grid gap-1 text-base">
                {consumo.map((item) => (
                  <li key={`${item.name}-${item.unit}`} className="flex justify-between gap-3">
                    <span>{item.name}</span>
                    <span className="font-semibold">{formatAmount(item.total, item.unit)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {rolos === null ? (
            <p className="text-lg text-muted">{t("projects.loadingSupplies")}</p>
          ) : rolos.length === 0 ? (
            <Card>
              <p className="text-lg font-semibold">{t("projects.noStock")}</p>
              <p className="mt-1 text-muted">
                {t("projects.noStockHint")}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rolos.map((rolo) => (
                <SpoolCard key={rolo.id} spool={rolo} />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {aba === "membros" ? (
        <Card>
          {isCoordinator ? (
            <div className="grid gap-4">
              <MembersEditor profiles={profiles} value={membrosForm} onChange={setMembrosForm} disabled={salvando} />
              <div className="flex justify-end">
                <Button disabled={salvando} onClick={salvarMembros}>
                  {salvando ? t("common.saving") : t("projects.saveMembers")}
                </Button>
              </div>
            </div>
          ) : project.members.length === 0 ? (
            <p className="text-muted">{t("projects.noMembers")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {project.members.map((member) => (
                <li key={member.profile_id} className="flex items-center gap-3">
                  <Avatar avatarUrl={member.avatar_url} name={member.full_name} />
                  <span className="font-semibold">{member.full_name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {aba === "fomento" ? (
        <Card>
          {isCoordinator ? (
            <div className="grid gap-4">
              <FundingEditor
                agencies={agencies}
                disabled={salvando}
                value={fomentoForm}
                onAgencyCreated={(agency) =>
                  setAgencies((current) => [...current, agency].sort((a, b) => a.acronym.localeCompare(b.acronym)))
                }
                onChange={setFomentoForm}
              />
              <div className="flex justify-end">
                <Button disabled={salvando} onClick={salvarFomento}>
                  {salvando ? t("common.saving") : t("projects.saveFunding")}
                </Button>
              </div>
            </div>
          ) : project.funding.length === 0 ? (
            <p className="text-muted">{t("projects.noFunding")}</p>
          ) : (
            <div className="grid gap-4">
              {project.funding.map((entry, index) => (
                <div key={index} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-bold">
                      {entry.agency_acronym}
                      {entry.grant_name ? ` — ${entry.grant_name}` : ""}
                    </p>
                    <p className="font-bold">{formatCurrencyBRL(getFundingTotal(entry))}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[entry.process_number ? t("projects.processNumber", { number: entry.process_number }) : null, formatProjectPeriod(entry.starts_on, entry.ends_on)]
                      .filter(Boolean)
                      .join(" · ") || t("projects.noProcess")}
                  </p>
                  {entry.items.length > 0 ? (
                    <ul className="mt-3 grid gap-1 text-base">
                      {entry.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex justify-between gap-3">
                          <span>
                            {getFundingCategoryLabel(item.category)}
                            {item.description ? ` · ${item.description}` : ""}
                          </span>
                          <span className="font-semibold">{formatCurrencyBRL(item.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tarefaAberta ? (
        <TaskModal
          key={tarefaAberta.task?.id ?? "nova"}
          showComments={tarefaAberta.comentarios}
          projectId={project.id}
          task={tarefaAberta.task}
          members={project.members}
          defaultStatus={tarefaAberta.status}
          canDelete={isCoordinator || tarefaAberta.task?.created_by === profile?.id}
          onClose={() => setTarefaAberta(null)}
          onSaved={async () => {
            setTarefaAberta(null);
            try {
              await carregarTarefas();
            } catch (error) {
              setErro(getTaskErrorMessage(error));
            }
          }}
        />
      ) : null}

      {editando ? (
        <ProjectFormModal
          project={project}
          onClose={() => setEditando(false)}
          onSaved={async () => {
            setEditando(false);
            await carregar();
          }}
        />
      ) : null}
    </>
  );
}
