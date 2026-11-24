import { useT } from "../i18n";
import { ExternalLink, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PurchaseFormModal } from "../components/compras/PurchaseFormModal";
import { PurchaseStepModal } from "../components/compras/PurchaseStepModal";
import { PURCHASES_CHANGED_EVENT } from "../components/layout/AttentionProvider";
import { useNotifications } from "../components/layout/NotificationsProvider";
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
  GENERAL_STOCK_LABEL,
  GENERAL_STOCK_VALUE,
  NO_EQUIPMENT_NAME,
  getPurchaseActions,
  getPurchaseCategoryLabel,
  getPurchaseErrorMessage,
  getPurchaseStatusLabel,
  getPurchaseStatusVariant,
  getPurchaseUrgencyLabel,
  getPurchaseUrgencyVariant,
  getUnitAmount,
  isValidPurchaseUrl,
  purchaseCategoryOptions,
  purchaseStatusOptions,
  purchaseUrgencyOptions,
  sortPurchases,
  summarizeByProject,
  summarizeMaintenanceSpending,
  type PurchaseFilters,
  type PurchaseRequest,
  type PurchaseStatus,
} from "../lib/purchases";
import { listProjects, listPurchaseRequests, setPurchaseStatus } from "../lib/supabaseRepository";

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-base font-normal text-text outline-none transition focus:border-primary";

export function Compras() {
  const t = useT();
  const { profile, labSettings } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const isCoordinator = profile?.role === "coordinator";
  const profileId = profile?.id ?? null;
  const { items: notificacoes, markAllRead } = useNotifications();
  const novidadesDeCompras = notificacoes.filter((item) => item.type === "purchase_status" && !item.read_at).length;
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [filters, setFilters] = useState<PurchaseFilters>({ status: "open", projectId: "all", category: "all", urgency: "all", kind: "all", mine: false });
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

  // Quem pediu já está vendo as decisões nesta página: o selo de novidades não precisa ficar aceso.
  useEffect(() => {
    if (!isCoordinator && novidadesDeCompras > 0) void markAllRead(["purchase_status"]);
  }, [novidadesDeCompras, isCoordinator, markAllRead]);

  const projetosAbertos = useMemo(() => projects.filter((project) => isProjectOpen(project.status)), [projects]);
  const visiveis = useMemo(() => sortPurchases(filterPurchases(purchases, filters, profileId)), [purchases, filters, profileId]);
  const totais = useMemo(() => summarizeByProject(purchases), [purchases]);
  const gastosManutencao = useMemo(() => summarizeMaintenanceSpending(purchases), [purchases]);
  const projetosComPedido = useMemo(() => {
    const ids = new Set(purchases.map((purchase) => purchase.project_id));
    return projects.filter((project) => ids.has(project.id));
  }, [purchases, projects]);

  async function mudar(purchase: PurchaseRequest, status: PurchaseStatus, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) return;
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
        title={t("purchases.title")}
        description={t("purchases.subtitle")}
        action={
          <Button fullWidth variant="success" onClick={() => setFormulario({ purchase: null })}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            {t("purchases.new")}
          </Button>
        }
      />

      {totais.length > 0 ? (
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-text">{t("purchases.summaryTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("purchases.summaryHint")}</p>
          <ul className="mt-3 grid gap-2">
            {totais.map((total) => (
              <li key={total.projectId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border border-border bg-background px-3 py-2">
                <span className="min-w-0 break-words font-semibold text-text">{total.projectName === GENERAL_STOCK_LABEL ? t("purchases.generalStockLab") : total.projectName}</span>
                <span className="text-sm text-muted">
                  {t("purchases.estimated")} <strong className="text-text">{formatCurrencyBRL(total.estimated)}</strong> · {t("purchases.paid")}{" "}
                  <strong className="text-text">{formatCurrencyBRL(total.paid)}</strong> · {t("purchases.requestCount", { count: total.count })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {gastosManutencao.count > 0 ? (
        <Card className="mb-6">
          <h3 className="text-xl font-bold text-text">{t("purchases.maintenanceSpending")}</h3>
          <p className="mt-1 text-sm text-muted">{t("purchases.maintenanceSpendingHint")}</p>
          <p className="mt-3 text-base text-text">
            {t("purchases.estimated")} <strong>{formatCurrencyBRL(gastosManutencao.estimated)}</strong> · {t("purchases.paid")} <strong>{formatCurrencyBRL(gastosManutencao.paid)}</strong> ·{" "}
            {t("purchases.requestCount", { count: gastosManutencao.count })}
          </p>
          {gastosManutencao.byEquipment.length > 1 || gastosManutencao.byEquipment[0]?.name !== NO_EQUIPMENT_NAME ? (
            <ul className="mt-3 grid gap-2">
              {gastosManutencao.byEquipment.map((group) => (
                <li key={group.name} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border border-border bg-background px-3 py-2">
                  <span className="min-w-0 break-words font-semibold text-text">{group.name === NO_EQUIPMENT_NAME ? t("purchases.noEquipment") : group.name}</span>
                  <span className="text-sm text-muted">
                    {t("purchases.estimated")} <strong className="text-text">{formatCurrencyBRL(group.estimated)}</strong> · {t("purchases.paid")} <strong className="text-text">{formatCurrencyBRL(group.paid)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          aria-label={t("purchases.filterStatus")}
          className={selectClassName}
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as PurchaseFilters["status"] })}
        >
          <option value="open">{t("purchases.statusOpen")}</option>
          <option value="all">{t("purchases.statusAll")}</option>
          {purchaseStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label={t("purchases.filterProject")}
          className={selectClassName}
          value={filters.projectId}
          onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}
        >
          <option value="all">{t("purchases.allProjects")}</option>
          <option value={GENERAL_STOCK_VALUE}>{t("purchases.generalStock")}</option>
          {projetosComPedido.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t("purchases.filterCategory")}
          className={selectClassName}
          value={filters.category}
          onChange={(event) => setFilters({ ...filters, category: event.target.value as PurchaseFilters["category"] })}
        >
          <option value="all">{t("purchases.allCategories")}</option>
          {purchaseCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label={t("purchases.filterUrgency")}
          className={selectClassName}
          value={filters.urgency}
          onChange={(event) => setFilters({ ...filters, urgency: event.target.value as PurchaseFilters["urgency"] })}
        >
          <option value="all">{t("purchases.allUrgencies")}</option>
          {purchaseUrgencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label={t("purchases.filterKind")}
          className={selectClassName}
          value={filters.kind}
          onChange={(event) => setFilters({ ...filters, kind: event.target.value as PurchaseFilters["kind"] })}
        >
          <option value="all">{t("purchases.allKinds")}</option>
          <option value="maintenance">{t("purchases.kindMaintenance")}</option>
          <option value="other">{t("purchases.kindOther")}</option>
        </select>
        <label className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-text">
          <input
            checked={filters.mine}
            className="h-4 w-4 accent-primary"
            type="checkbox"
            onChange={(event) => setFilters({ ...filters, mine: event.target.checked })}
          />
          {t("purchases.onlyMine")}
        </label>
      </div>

      {erro ? (
        <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {!carregado ? null : visiveis.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold text-muted">
            {purchases.length === 0 ? t("purchases.none") : t("purchases.noneFiltered")}
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
                        {purchase.project_id === null ? t("purchases.generalStockLab") : purchase.project_name} · {purchase.requested_by_name ?? t("purchases.someone")} · {formatMaintenanceDateTime(purchase.created_at, timezone)}
                      </p>
                      {purchase.maintenance_equipment_name ? (
                        <p className="mt-1 text-sm font-semibold text-muted">{t("purchases.partFor", { name: purchase.maintenance_equipment_name })}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {purchase.urgency !== "normal" && (purchase.status === "requested" || purchase.status === "approved" || purchase.status === "purchased") ? (
                        <StatusBadge label={getPurchaseUrgencyLabel(purchase.urgency)} variant={getPurchaseUrgencyVariant(purchase.urgency)} />
                      ) : null}
                      <StatusBadge label={getPurchaseStatusLabel(purchase.status)} variant={getPurchaseStatusVariant(purchase.status)} />
                    </div>
                  </div>

                  <p className="text-base text-text">
                    <span className="mr-2 rounded-full border border-border bg-background px-2 py-0.5 text-sm font-semibold text-muted">
                      {getPurchaseCategoryLabel(purchase.funding_category)}
                    </span>
                    {purchase.for_maintenance ? (
                      <span className="mr-2 rounded-full border border-warning-dark bg-warning-soft px-2 py-0.5 text-sm font-semibold text-text">{t("purchases.maintenanceTag")}</span>
                    ) : null}
                    {t("purchases.estimatedLabel")} <strong>{formatCurrencyBRL(purchase.estimated_amount)}</strong>
                    {getUnitAmount(purchase.estimated_amount, purchase.quantity) !== null ? (
                      <span className="text-muted"> ({purchase.quantity} × {formatCurrencyBRL(getUnitAmount(purchase.estimated_amount, purchase.quantity) as number)})</span>
                    ) : null}
                    {purchase.actual_amount !== null ? (
                      <>
                        {" "}
                        · {t("purchases.paid")} <strong>{formatCurrencyBRL(purchase.actual_amount)}</strong>
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
                        {t("purchases.openLink")}
                      </a>
                    ) : null
                  ) : null}
                  {purchase.notes ? <p className="whitespace-pre-wrap break-words text-sm text-muted">{purchase.notes}</p> : null}
                  {purchase.status === "rejected" ? (
                    <p className="rounded-lg border border-danger bg-danger-soft p-3 text-sm text-text">
                      <span className="font-semibold">{t("purchases.statusRejected")}</span>
                      {purchase.decided_by_name ? t("purchases.byPerson", { name: purchase.decided_by_name }) : ""}
                      {purchase.rejected_reason ? `: ${purchase.rejected_reason}` : "."}
                    </p>
                  ) : purchase.decided_by_name && purchase.status !== "requested" && purchase.status !== "cancelled" ? (
                    <p className="text-sm text-muted">{t("purchases.approvedBy", { name: purchase.decided_by_name })}</p>
                  ) : null}

                  {actions.edit || actions.cancel || actions.approve || actions.reject || actions.purchase || actions.deliver || actions.undo ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {actions.undo ? (
                        <Button
                          className="min-h-9 px-3 py-2 text-sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            const undo = actions.undo;
                            if (undo) void mudar(purchase, undo.status, `${undo.label}?${undo.warning ? ` ${undo.warning}` : ""}`);
                          }}
                        >
                          {actions.undo.label}
                        </Button>
                      ) : null}
                      {actions.edit ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => setFormulario({ purchase })}>
                          {t("purchases.edit")}
                        </Button>
                      ) : null}
                      {actions.cancel ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => mudar(purchase, "cancelled", t("purchases.cancelConfirm"))}>
                          {t("purchases.cancelRequest")}
                        </Button>
                      ) : null}
                      {actions.reject ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={busy} onClick={() => setPasso({ mode: "reject", purchase })}>
                          {t("purchases.reject")}
                        </Button>
                      ) : null}
                      {actions.approve ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => mudar(purchase, "approved")}>
                          {t("purchases.approve")}
                        </Button>
                      ) : null}
                      {actions.purchase ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => setPasso({ mode: "purchase", purchase })}>
                          {t("purchases.markPurchased")}
                        </Button>
                      ) : null}
                      {actions.deliver ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => mudar(purchase, "delivered")}>
                          {t("purchases.markDelivered")}
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
          defaultProjectId={filters.projectId === GENERAL_STOCK_VALUE || (filters.projectId !== "all" && projetosAbertos.some((project) => project.id === filters.projectId)) ? filters.projectId : projetosAbertos.length === 1 ? projetosAbertos[0].id : ""}
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
