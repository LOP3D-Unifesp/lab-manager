import { useT } from "../i18n";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, Plus } from "lucide-react";

import { GeneralTasksBoard } from "../components/projetos/GeneralTasksBoard";
import { ProjectFormModal } from "../components/projetos/ProjectFormModal";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import {
  filterProjects,
  formatCurrencyBRL,
  formatProjectPeriod,
  getProjectErrorMessage,
  getProjectFundingTotal,
  getProjectStatusLabel,
  getProjectStatusVariant,
  projectStatusOptions,
  sortProjects,
  type Project,
  type ProjectDirectoryEntry,
  type ProjectFundingFilter,
  type ProjectStatus,
} from "../lib/projects";
import { listProjectDirectory, listProjects } from "../lib/supabaseRepository";

const selectClassName =
  "min-h-11 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

export function Projetos() {
  const t = useT();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCoordinator = profile?.role === "coordinator";
  const vistaParam = searchParams.get("vista");
  // "todos" (resumo de todos os projetos, para pedir entrada) só existe para quem não é coordenador: eles já veem tudo.
  const vista = vistaParam === "quadro" ? "quadro" : vistaParam === "todos" && !isCoordinator ? "todos" : "lista";
  const [diretorio, setDiretorio] = useState<ProjectDirectoryEntry[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [funding, setFunding] = useState<ProjectFundingFilter>("all");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let ativo = true;
    listProjects()
      .then((data) => ativo && setProjects(data))
      .catch((error) => ativo && setErro(getProjectErrorMessage(error)));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (vista !== "todos" || diretorio !== null) return undefined;
    let ativo = true;
    listProjectDirectory()
      .then((data) => ativo && setDiretorio(data))
      .catch((error) => ativo && setErro(getProjectErrorMessage(error)));
    return () => {
      ativo = false;
    };
  }, [vista, diretorio]);

  const diretorioVisivel = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (diretorio ?? []).filter(
      (item) => (status === "all" || item.status === status) && (!termo || item.name.toLowerCase().includes(termo)),
    );
  }, [diretorio, status, busca]);

  const visiveis = useMemo(
    () => sortProjects(filterProjects(projects ?? [], { status, funding, search: busca })),
    [projects, status, funding, busca],
  );

  return (
    <>
      <PageHeader
        title={t("projects.title")}
        description={
          isCoordinator
            ? t("projects.subtitleCoordinator")
            : vista === "todos"
              ? t("projects.allHint")
              : t("projects.subtitleResearcher")
        }
        action={
          isCoordinator && vista === "lista" ? (
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              {t("projects.new")}
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label={t("projects.view")} className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1">
        {(
          [
            { id: "lista", label: t("projects.tabList") },
            { id: "quadro", label: t("projects.tabBoard") },
            ...(isCoordinator ? [] : [{ id: "todos", label: t("projects.tabAll") }]),
          ] as ReadonlyArray<{ id: "lista" | "quadro" | "todos"; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={vista === item.id}
            className={[
              "rounded-md px-4 py-2 text-base font-semibold transition",
              vista === item.id ? "bg-primary-dark text-white dark:bg-primary" : "text-muted hover:text-text",
            ].join(" ")}
            onClick={() => setSearchParams(item.id === "lista" ? {} : { vista: item.id }, { replace: true })}
          >
            {item.label}
          </button>
        ))}
      </div>

      {vista === "todos" ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_200px]">
            <input
              className={selectClassName}
              placeholder={t("projects.searchByName")}
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
            <select
              aria-label={t("projects.filterStatus")}
              className={selectClassName}
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")}
            >
              <option value="all">{t("projects.allStatuses")}</option>
              {projectStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {erro ? (
            <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
          ) : null}
          {diretorio === null && !erro ? <p className="text-lg text-muted">{t("projects.loading")}</p> : null}
          {diretorio !== null && diretorioVisivel.length === 0 ? (
            <Card>
              <p className="py-4 text-center text-lg font-semibold">{t("projects.noneFiltered")}</p>
            </Card>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {diretorioVisivel.map((project) => {
              const periodo = formatProjectPeriod(project.starts_on, project.ends_on);
              return (
                <Link key={project.id} to={`/projetos/${project.id}`} className="block h-full min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Card className="h-full transition hover:border-primary">
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="min-w-0 truncate text-xl font-bold leading-snug text-text" title={project.name}>
                          {project.name}
                        </h3>
                        <StatusBadge label={getProjectStatusLabel(project.status)} variant={getProjectStatusVariant(project.status)} />
                      </div>
                      {/* Descrição e período reservam o espaço mesmo vazios, para as linhas seguintes alinharem entre os cartões. */}
                      <p className="line-clamp-2 min-h-[3rem] text-base text-muted">{project.description ?? ""}</p>
                      <p className="min-h-5 text-sm text-muted">{periodo ?? ""}</p>
                      <div className="flex min-h-7 flex-wrap items-center gap-2">
                        {project.is_member ? <StatusBadge label={t("projects.badgeMember")} variant="success" /> : null}
                        {project.my_request_id ? <StatusBadge label={t("projects.badgeRequested")} variant="warning" /> : null}
                        {project.pending_count > 0 ? (
                          <StatusBadge label={t("projects.pendingRequests", { count: project.pending_count })} variant="info" />
                        ) : null}
                      </div>
                      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                        <div className="flex -space-x-2">
                          {project.members.slice(0, 5).map((member) => (
                            <Avatar key={member.profile_id} avatarUrl={member.avatar_url} name={member.full_name} className="h-8 w-8 ring-2 ring-surface" />
                          ))}
                        </div>
                        <span className="text-sm text-muted">{t("projects.peopleCount", { count: project.members.length })}</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </>
      ) : vista === "quadro" ? (
        projects === null ? (
          erro ? (
            <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
          ) : (
            <p className="text-lg text-muted">{t("projects.loading")}</p>
          )
        ) : (
          <GeneralTasksBoard isCoordinator={Boolean(isCoordinator)} profileId={profile?.id ?? ""} projects={projects} />
        )
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
            <input
              className={selectClassName}
              placeholder={t("projects.searchByName")}
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
            <select
              aria-label={t("projects.filterStatus")}
              className={selectClassName}
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")}
            >
              <option value="all">{t("projects.allStatuses")}</option>
              {projectStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label={t("projects.filterFunding")}
              className={selectClassName}
              value={funding}
              onChange={(event) => setFunding(event.target.value as ProjectFundingFilter)}
            >
              <option value="all">{t("projects.fundingAll")}</option>
              <option value="funded">{t("projects.fundingYes")}</option>
              <option value="unfunded">{t("projects.fundingNo")}</option>
            </select>
          </div>

          {erro ? (
            <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
          ) : null}

          {projects === null && !erro ? <p className="text-lg text-muted">{t("projects.loading")}</p> : null}

          {projects !== null && visiveis.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <FolderKanban className="h-8 w-8 text-muted" aria-hidden="true" />
                <p className="text-lg font-semibold">
                  {projects.length === 0 ? t("projects.none") : t("projects.noneFiltered")}
                </p>
                {projects.length === 0 && !isCoordinator ? (
                  <p className="text-muted">{t("projects.askCoordinator")}</p>
                ) : null}
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((project) => {
              const total = getProjectFundingTotal(project);
              const agencias = [...new Set(project.funding.map((entry) => entry.agency_acronym))];
              const periodo = formatProjectPeriod(project.starts_on, project.ends_on);
              return (
                <Link key={project.id} to={`/projetos/${project.id}`} className="block h-full min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Card className="h-full transition hover:border-primary">
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="min-w-0 truncate text-xl font-bold leading-snug text-text" title={project.name}>
                          {project.name}
                        </h3>
                        <StatusBadge label={getProjectStatusLabel(project.status)} variant={getProjectStatusVariant(project.status)} />
                      </div>
                      {/* Descrição e período reservam o espaço mesmo vazios, para as linhas seguintes alinharem entre os cartões. */}
                      <p className="line-clamp-2 min-h-[3rem] text-base text-muted">{project.description ?? ""}</p>
                      <p className="min-h-5 text-sm text-muted">{periodo ?? ""}</p>
                      <div className="flex min-h-7 flex-wrap items-center gap-2">
                        {agencias.length > 0 ? (
                          agencias.map((acronym) => <StatusBadge key={acronym} label={acronym} variant="info" />)
                        ) : (
                          <StatusBadge label={t("projects.fundingNo")} />
                        )}
                        {total > 0 ? <span className="text-sm font-semibold text-text">{formatCurrencyBRL(total)}</span> : null}
                      </div>
                      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
                        <div className="flex -space-x-2">
                          {project.members.slice(0, 5).map((member) => (
                            <Avatar
                              key={member.profile_id}
                              avatarUrl={member.avatar_url}
                              name={member.full_name}
                              className="h-8 w-8 ring-2 ring-surface"
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted">
                          {t("projects.peopleCount", { count: project.members.length })}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

        </>
      )}

      {modalAberto ? (
        <ProjectFormModal
          onClose={() => setModalAberto(false)}
          onSaved={(id) => {
            setModalAberto(false);
            navigate(`/projetos/${id}`);
          }}
        />
      ) : null}
    </>
  );
}
