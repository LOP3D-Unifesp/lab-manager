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
  type ProjectFundingFilter,
  type ProjectStatus,
} from "../lib/projects";
import { listProjects } from "../lib/supabaseRepository";

const selectClassName =
  "min-h-11 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

export function Projetos() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const vista = searchParams.get("vista") === "quadro" ? "quadro" : "lista";
  const isCoordinator = profile?.role === "coordinator";
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

  const visiveis = useMemo(
    () => sortProjects(filterProjects(projects ?? [], { status, funding, search: busca })),
    [projects, status, funding, busca],
  );

  return (
    <>
      <PageHeader
        title="Projetos"
        description={
          isCoordinator
            ? "Cadastre projetos, inclua pesquisadores e registre o fomento."
            : "Projetos do laboratório em que você participa."
        }
        action={
          isCoordinator && vista === "lista" ? (
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              Novo projeto
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Vista" className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1">
        {(
          [
            { id: "lista", label: "Projetos" },
            { id: "quadro", label: "Quadro de tarefas" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={vista === item.id}
            className={[
              "rounded-md px-4 py-2 text-base font-semibold transition",
              vista === item.id ? "bg-primary-dark text-white" : "text-muted hover:text-text",
            ].join(" ")}
            onClick={() => setSearchParams(item.id === "quadro" ? { vista: "quadro" } : {}, { replace: true })}
          >
            {item.label}
          </button>
        ))}
      </div>

      {vista === "quadro" ? (
        projects === null ? (
          erro ? (
            <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
          ) : (
            <p className="text-lg text-muted">Carregando projetos...</p>
          )
        ) : (
          <GeneralTasksBoard isCoordinator={Boolean(isCoordinator)} profileId={profile?.id ?? ""} projects={projects} />
        )
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
            <input
              className={selectClassName}
              placeholder="Buscar por nome"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
            <select
              aria-label="Situação"
              className={selectClassName}
              value={status}
              onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")}
            >
              <option value="all">Todas as situações</option>
              {projectStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Fomento"
              className={selectClassName}
              value={funding}
              onChange={(event) => setFunding(event.target.value as ProjectFundingFilter)}
            >
              <option value="all">Com e sem fomento</option>
              <option value="funded">Com fomento</option>
              <option value="unfunded">Sem fomento</option>
            </select>
          </div>

          {erro ? (
            <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
          ) : null}

          {projects === null && !erro ? <p className="text-lg text-muted">Carregando projetos...</p> : null}

          {projects !== null && visiveis.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <FolderKanban className="h-8 w-8 text-muted" aria-hidden="true" />
                <p className="text-lg font-semibold">
                  {projects.length === 0 ? "Nenhum projeto por aqui ainda." : "Nenhum projeto com esses filtros."}
                </p>
                {projects.length === 0 && !isCoordinator ? (
                  <p className="text-muted">Peça a um coordenador para incluir você em um projeto.</p>
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
                <Link key={project.id} to={`/projetos/${project.id}`} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Card>
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold leading-snug text-text">{project.name}</h3>
                        <StatusBadge label={getProjectStatusLabel(project.status)} variant={getProjectStatusVariant(project.status)} />
                      </div>
                      {project.description ? <p className="line-clamp-2 text-base text-muted">{project.description}</p> : null}
                      {periodo ? <p className="text-sm text-muted">{periodo}</p> : null}
                      <div className="flex flex-wrap gap-2">
                        {agencias.length > 0 ? (
                          agencias.map((acronym) => <StatusBadge key={acronym} label={acronym} variant="info" />)
                        ) : (
                          <StatusBadge label="Sem fomento" />
                        )}
                        {total > 0 ? <span className="text-sm font-semibold text-text">{formatCurrencyBRL(total)}</span> : null}
                      </div>
                      <div className="mt-auto flex items-center gap-2 pt-2">
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
                          {project.members.length === 1 ? "1 pessoa" : `${project.members.length} pessoas`}
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
