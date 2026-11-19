import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";

import { FundingEditor, fundingFormToInput, fundingToForm, type FundingForm } from "../components/projetos/FundingEditor";
import { MembersEditor } from "../components/projetos/MembersEditor";
import { ProjectFormModal } from "../components/projetos/ProjectFormModal";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import type { PublicProfile } from "../lib/domain";
import {
  formatCurrencyBRL,
  formatProjectPeriod,
  getFundingCategoryLabel,
  getFundingTotal,
  getProjectErrorMessage,
  getProjectFundingTotal,
  getProjectStatusLabel,
  getProjectStatusVariant,
  type FundingAgencyRecord,
  type Project,
} from "../lib/projects";
import {
  getProject,
  listFundingAgencies,
  listProfiles,
  replaceProjectFunding,
  replaceProjectMembers,
} from "../lib/supabaseRepository";

type Aba = "geral" | "membros" | "fomento";

const abas: Array<{ id: Aba; label: string }> = [
  { id: "geral", label: "Visão geral" },
  { id: "membros", label: "Membros" },
  { id: "fomento", label: "Fomento" },
];

export function ProjetoDetalhe() {
  const { id = "" } = useParams();
  const { profile } = useAuth();
  const isCoordinator = profile?.role === "coordinator";
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [aba, setAba] = useState<Aba>("geral");
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [agencies, setAgencies] = useState<FundingAgencyRecord[]>([]);
  const [membrosForm, setMembrosForm] = useState<string[]>([]);
  const [fomentoForm, setFomentoForm] = useState<FundingForm[]>([]);

  const carregar = useCallback(async () => {
    const data = await getProject(id);
    setProject(data);
    if (data) {
      setMembrosForm(data.members.map((member) => member.profile_id));
      setFomentoForm(fundingToForm(data.funding));
    }
  }, [id]);

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
      setAviso("Membros atualizados.");
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
      setAviso("Fomento atualizado.");
    } catch (error) {
      setErro(getProjectErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  if (project === undefined) {
    return <p className="text-lg text-muted">Carregando projeto...</p>;
  }

  if (project === null) {
    return (
      <Card>
        <p className="text-lg font-semibold">Projeto não encontrado.</p>
        <p className="mt-1 text-muted">Ele não existe ou você não participa dele.</p>
        <Link className="mt-3 inline-block font-semibold text-primary underline" to="/projetos">
          Voltar para projetos
        </Link>
      </Card>
    );
  }

  const periodo = formatProjectPeriod(project.starts_on, project.ends_on);

  return (
    <>
      <Link className="mb-3 inline-flex items-center gap-2 font-semibold text-primary" to="/projetos">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Projetos
      </Link>
      <PageHeader
        title={project.name}
        description={project.description ?? "Sem descrição."}
        action={
          isCoordinator ? (
            <Button variant="secondary" onClick={() => setEditando(true)}>
              <Pencil className="mr-2 h-5 w-5" aria-hidden="true" />
              Editar projeto
            </Button>
          ) : undefined
        }
      />

      <div role="tablist" className="mb-5 flex gap-2 overflow-x-auto border-b border-border">
        {abas.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={aba === item.id}
            className={[
              "-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-base font-semibold transition",
              aba === item.id ? "border-primary text-primary" : "border-transparent text-muted hover:text-text",
            ].join(" ")}
            onClick={() => {
              setAba(item.id);
              setErro("");
              setAviso("");
            }}
          >
            {item.label}
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
              <dt className="text-sm font-semibold text-muted">Situação</dt>
              <dd className="mt-1">
                <StatusBadge label={getProjectStatusLabel(project.status)} variant={getProjectStatusVariant(project.status)} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Período</dt>
              <dd className="mt-1 font-bold">{periodo ?? "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Membros</dt>
              <dd className="mt-1 font-bold">{project.members.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-muted">Fomento</dt>
              <dd className="mt-1 font-bold">
                {project.funding.length === 0
                  ? "Sem fomento"
                  : `${project.funding.map((entry) => entry.agency_acronym).join(", ")} — ${formatCurrencyBRL(getProjectFundingTotal(project))}`}
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {aba === "membros" ? (
        <Card>
          {isCoordinator ? (
            <div className="grid gap-4">
              <MembersEditor profiles={profiles} value={membrosForm} onChange={setMembrosForm} disabled={salvando} />
              <div className="flex justify-end">
                <Button disabled={salvando} onClick={salvarMembros}>
                  {salvando ? "Salvando..." : "Salvar membros"}
                </Button>
              </div>
            </div>
          ) : project.members.length === 0 ? (
            <p className="text-muted">Nenhum membro cadastrado.</p>
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
                  {salvando ? "Salvando..." : "Salvar fomento"}
                </Button>
              </div>
            </div>
          ) : project.funding.length === 0 ? (
            <p className="text-muted">Projeto sem fomento.</p>
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
                    {[entry.process_number ? `Processo ${entry.process_number}` : null, formatProjectPeriod(entry.starts_on, entry.ends_on)]
                      .filter(Boolean)
                      .join(" · ") || "Sem processo ou vigência informados"}
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
