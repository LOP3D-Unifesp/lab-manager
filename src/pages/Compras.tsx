import { ExternalLink, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PurchaseFormModal } from "../components/compras/PurchaseFormModal";
import { PurchaseStepModal } from "../components/compras/PurchaseStepModal";
import { PURCHASES_CHANGED_EVENT } from "../components/layout/AttentionProvider";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import { getTimezonePadrao } from "../lib/domain";
import { formatMaintenanceDateTime } from "../lib/maintenance";
import { formatCurrencyBRL, isProjectOpen, type Project } from "../lib/projects";
import {
  filterPurchases,
  getPurchaseActions,
  getPurchaseErrorMessage,
  getPurchaseStatusLabel,
  getPurchaseStatusVariant,
  isValidPurchaseUrl,
  purchaseStatusOptions,
  sortPurchases,
  summarizeByProject,
  type PurchaseFilters,
  type PurchaseRequest,
  type PurchaseStatus,
} from "../lib/purchases";
import { listProjects, listPurchaseRequests, setPurchaseStatus } from "../lib/supabaseRepository";

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-base font-normal text-text outline-none transition focus:border-primary";

export function Compras() {
  const { profile, labSettings } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const isCoordinator = profile?.role === "coordinator";
  const profileId = profile?.id ?? null;
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [filters, setFilters] = useState<PurchaseFilters>({ status: "open", projectId: "all", mine: false });
  const [formulario, setFormulario] = useState<{ purchase: PurchaseRequest | null } | null>(null);
  const [passo, setPasso] = useState<{ mode: "reject" | "purchase"; purchase: PurchaseRequest } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    try {
      const [purchasesData, projectsData] = await Promise.all([listPurchaseRequests(), listProjects()]);
      setPurchases(purchasesData);
      setProjects(projectsData);
      window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
    } catch (error) {
      setErro(getPurchaseErrorMessage(error));
    } finally {
      setCarregado(true);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const projetosAbertos = useMemo(() => projects.filter((project) => isProjectOpen(project.status)), [projects]);
  const visiveis = useMemo(() => sortPurchases(filterPurchases(purchases, filters, profileId)), [purchases, filters, profileId]);
  const totais = useMemo(() => summarizeByProject(purchases), [purchases]);
  const projetosComPedido = useMemo(() => {
    const ids = new Set(purchases.map((purchase) => purchase.project_id));
    return projects.filter((project) => ids.has(project.id));
  }, [purchases, projects]);

  async function mudar(purchase: PurchaseRequest, status: PurchaseStatus) {
    if (status === "cancelled" && !window.confirm("Cancelar este pedido?")) return;
    try {
      setOcupado(purchase.id);
      setErro("");
      await setPurchaseStatus({ requestId: purchase.id, status });
      await carregar();
    } catch (error) {
      setErro(getPurchaseErrorMessage(error));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Pedidos de compra dos projetos: o coordenador aprova, compra e confirma a entrega."
        action={
          <Button fullWidth variant="success" onClick={() => setFormulario({ purchase: null })}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            Novo pedido
          </Button>
        }
      />

      {totais.length > 0 ? (
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-text">Resumo por projeto</h3>
          <p className="mt-1 text-sm text-muted">Previsto são os pedidos ainda não comprados; pago soma os comprados e entregues. Recusados e cancelados ficam de fora.</p>
          <ul className="mt-3 grid gap-2">
            {totais.map((total) => (
              <li key={total.projectId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border border-border bg-background px-3 py-2">
                <span className="min-w-0 break-words font-semibold text-text">{total.projectName}</span>
                <span className="text-sm text-muted">
                  Previsto <strong className="text-text">{formatCurrencyBRL(total.estimated)}</strong> · Pago{" "}
                  <strong className="text-text">{formatCurrencyBRL(total.paid)}</strong> · {total.count} {total.count === 1 ? "pedido" : "pedidos"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label="Situação"
          className={selectClassName}
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as PurchaseFilters["status"] })}
        >
          <option value="open">Em andamento</option>
          <option value="all">Todos</option>
          {purchaseStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Projeto"
          className={selectClassName}
          value={filters.projectId}
          onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}
        >
          <option value="all">Todos os projetos</option>
          {projetosComPedido.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <label className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-text">
          <input
            checked={filters.mine}
            className="h-4 w-4 accent-primary"
            type="checkbox"
            onChange={(event) => setFilters({ ...filters, mine: event.target.checked })}
          />
          Só os meus pedidos
        </label>
      </div>

      {erro ? (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {!carregado ? null : visiveis.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold text-muted">
            {purchases.length === 0 ? "Nenhum pedido de compra ainda." : "Nenhum pedido com esses filtros."}
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {visiveis.map((purchase) => {
            const actions = getPurchaseActions(purchase, profileId, isCoordinator);
            const busy = ocupado === purchase.id;
            return (
              <li key={purchase.id}>
                <Card className="grid gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-bold text-text">
                        {purchase.item}
                        {purchase.quantity > 1 ? <span className="font-semibold text-muted"> × {purchase.quantity}</span> : null}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {purchase.project_name} · {purchase.requested_by_name ?? "Alguém"} · {formatMaintenanceDateTime(purchase.created_at, timezone)}
                      </p>
                    </div>
                    <StatusBadge label={getPurchaseStatusLabel(purchase.status)} variant={getPurchaseStatusVariant(purchase.status)} />
                  </div>

                  <p className="text-base text-text">
                    Estimado <strong>{formatCurrencyBRL(purchase.estimated_amount)}</strong>
                    {purchase.actual_amount !== null ? (
                      <>
                        {" "}
                        · Pago <strong>{formatCurrencyBRL(purchase.actual_amount)}</strong>
                      </>
                    ) : null}
                  </p>

                  {purchase.url ? (
                    isValidPurchaseUrl(purchase.url) ? (
                      <a
                        href={purchase.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit max-w-full items-center gap-1 break-all text-sm font-semibold text-primary underline"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                        Abrir link do item
                      </a>
                    ) : null
                  ) : null}
                  {purchase.notes ? <p className="whitespace-pre-wrap break-words text-sm text-muted">{purchase.notes}</p> : null}
                  {purchase.status === "rejected" ? (
                    <p className="rounded-lg border border-danger bg-danger-soft p-3 text-sm text-text">
                      <span className="font-semibold">Recusado</span>
                      {purchase.decided_by_name ? ` por ${purchase.decided_by_name}` : ""}
                      {purchase.rejected_reason ? `: ${purchase.rejected_reason}` : "."}
                    </p>
                  ) : purchase.decided_by_name && purchase.status !== "requested" && purchase.status !== "cancelled" ? (
                    <p className="text-sm text-muted">Aprovado por {purchase.decided_by_name}</p>
                  ) : null}

                  {actions.edit || actions.cancel || actions.approve || actions.reject || actions.purchase || actions.deliver ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {actions.edit ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => setFormulario({ purchase })}>
                          Editar
                        </Button>
                      ) : null}
                      {actions.cancel ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => mudar(purchase, "cancelled")}>
                          Cancelar pedido
                        </Button>
                      ) : null}
                      {actions.reject ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={busy} onClick={() => setPasso({ mode: "reject", purchase })}>
                          Recusar
                        </Button>
                      ) : null}
                      {actions.approve ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => mudar(purchase, "approved")}>
                          Aprovar
                        </Button>
                      ) : null}
                      {actions.purchase ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => setPasso({ mode: "purchase", purchase })}>
                          Marcar como comprado
                        </Button>
                      ) : null}
                      {actions.deliver ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => mudar(purchase, "delivered")}>
                          Marcar como entregue
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {formulario ? (
        <PurchaseFormModal
          projects={projetosAbertos}
          purchase={formulario.purchase}
          defaultProjectId={filters.projectId !== "all" && projetosAbertos.some((project) => project.id === filters.projectId) ? filters.projectId : projetosAbertos.length === 1 ? projetosAbertos[0].id : ""}
          onClose={() => setFormulario(null)}
          onDone={async () => {
            setFormulario(null);
            await carregar();
          }}
        />
      ) : null}

      {passo ? (
        <PurchaseStepModal
          mode={passo.mode}
          purchase={passo.purchase}
          onClose={() => setPasso(null)}
          onDone={async () => {
            setPasso(null);
            await carregar();
          }}
        />
      ) : null}
    </div>
  );
}
