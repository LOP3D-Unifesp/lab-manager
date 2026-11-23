import { ShoppingCart } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { Equipment, EquipmentType } from "../../lib/domain";
import {
  filterRequests,
  getMaintenanceRequestStatusLabel,
  getMaintenanceRequestStatusVariant,
  getMaintenanceUrgencyLabel,
  getMaintenanceUrgencyVariant,
  getRequestActions,
  getRequestErrorMessage,
  isRequestActive,
  isRequestSort,
  orderRequests,
  requestSortOptions,
  type RequestSort,
  type MaintenanceRequest,
  type MaintenanceRequestStatus,
  type RequestFilters,
} from "../../lib/maintenanceRequests";
import { formatMaintenanceDateTime } from "../../lib/maintenance";
import { isProjectOpen, type Project } from "../../lib/projects";
import { GENERAL_STOCK_VALUE, getPurchaseStatusLabel, getPurchaseStatusVariant, type MaintenancePurchase } from "../../lib/purchases";
import {
  endEquipmentMaintenance,
  getMaintenancePhotoUrls,
  listProjects,
  listPurchasesForMaintenance,
  setMaintenanceRequestStatus,
} from "../../lib/supabaseRepository";
import { PURCHASES_CHANGED_EVENT } from "../layout/AttentionProvider";
import { PurchaseFormModal } from "../compras/PurchaseFormModal";
import { createZip, slugifyFileName } from "../../lib/zip";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { PhotoViewer } from "../ui/PhotoViewer";
import { StatusBadge } from "../ui/StatusBadge";

type PanelProps = {
  requests: MaintenanceRequest[];
  equipment: Equipment[];
  types: EquipmentType[];
  profileId: string | null;
  canMaintainNow: boolean;
  timezone: string;
  onChanged: () => Promise<void> | void;
};

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-base font-normal text-text outline-none transition focus:border-primary";

const TYPE_FILTER_KEY = "chamados:tipo";
const SORT_KEY = "chamados:ordem";

function readSavedSort(): RequestSort {
  try {
    const saved = window.localStorage.getItem(SORT_KEY);
    return isRequestSort(saved) ? saved : "priority";
  } catch {
    return "priority";
  }
}

function readSavedType() {
  try {
    return window.localStorage.getItem(TYPE_FILTER_KEY) ?? "all";
  } catch {
    return "all";
  }
}

export function MaintenanceRequestsPanel({ canMaintainNow, equipment, onChanged, profileId, requests, timezone, types }: PanelProps) {
  const [filters, setFilters] = useState<RequestFilters>(() => ({ typeId: readSavedType(), equipmentId: "all", status: "active", mine: false }));
  const [sort, setSort] = useState<RequestSort>(readSavedSort);
  const [releaseToo, setReleaseToo] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<MaintenanceRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{ request: MaintenanceRequest; index: number } | null>(null);
  const [linkedParts, setLinkedParts] = useState<MaintenancePurchase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [partFor, setPartFor] = useState<MaintenanceRequest | null>(null);

  // Peças pedidas a partir dos chamados (as que a pessoa pode ver) e, para quem trata chamados, os projetos
  // em aberto onde ela pode pedir uma peça.
  useEffect(() => {
    let ativo = true;
    const carregar = () => {
      listPurchasesForMaintenance()
        .then((data) => ativo && setLinkedParts(data))
        .catch(() => undefined);
    };
    carregar();
    window.addEventListener(PURCHASES_CHANGED_EVENT, carregar);
    return () => {
      ativo = false;
      window.removeEventListener(PURCHASES_CHANGED_EVENT, carregar);
    };
  }, [requests]);

  useEffect(() => {
    if (!canMaintainNow) return;
    listProjects()
      .then((data) => setProjects(data.filter((project) => isProjectOpen(project.status))))
      .catch(() => undefined);
  }, [canMaintainNow]);

  const allPhotoPaths = useMemo(() => requests.flatMap((request) => request.photo_paths).sort().join("|"), [requests]);
  useEffect(() => {
    let ativo = true;
    const paths = allPhotoPaths ? allPhotoPaths.split("|") : [];
    getMaintenancePhotoUrls(paths)
      .then((urls) => ativo && setPhotoUrls(urls))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [allPhotoPaths]);

  const visible = useMemo(
    () => orderRequests(filterRequests(requests, filters, profileId), sort),
    [requests, filters, profileId, sort],
  );

  async function change(request: MaintenanceRequest, status: MaintenanceRequestStatus, resolutionNotes?: string) {
    try {
      setBusyId(request.id);
      setErro("");
      await setMaintenanceRequestStatus({ requestId: request.id, status, resolutionNotes });
      await onChanged();
      return true;
    } catch (error) {
      setErro(getRequestErrorMessage(error));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolving) return;
    const equipmentInMaintenance = equipment.find((item) => item.id === resolving.equipment_id)?.status === "maintenance";
    const release = releaseToo && resolving.status === "in_progress" && equipmentInMaintenance;
    try {
      setBusyId(resolving.id);
      setErro("");
      if (release) await endEquipmentMaintenance(resolving.equipment_id, notes.trim() || null);
      else await setMaintenanceRequestStatus({ requestId: resolving.id, status: "resolved", resolutionNotes: notes });
      await onChanged();
      setResolving(null);
      setNotes("");
    } catch (error) {
      setErro(getRequestErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  function changeSort(value: string) {
    if (!isRequestSort(value)) return;
    setSort(value);
    try {
      window.localStorage.setItem(SORT_KEY, value);
    } catch {
      // sem armazenamento local: a ordem só vale nesta visita
    }
  }

  function changeType(typeId: string) {
    setFilters({ ...filters, typeId, equipmentId: "all" });
    try {
      window.localStorage.setItem(TYPE_FILTER_KEY, typeId);
    } catch {
      // sem armazenamento local: o filtro só vale nesta visita
    }
  }

  async function downloadPhotos(request: MaintenanceRequest) {
    try {
      setDownloadingId(request.id);
      setErro("");
      const files = await Promise.all(
        request.photo_paths.map(async (path, index) => {
          const url = photoUrls[path];
          if (!url) throw new Error("As fotos ainda estão carregando. Tente de novo em instantes.");
          const response = await fetch(url);
          if (!response.ok) throw new Error("Não foi possível baixar uma das fotos.");
          return { name: `foto-${index + 1}.jpg`, data: new Uint8Array(await response.arrayBuffer()) };
        }),
      );
      const blob = new Blob([createZip(files)], { type: "application/zip" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `chamado-${slugifyFileName(request.equipment_name)}-${request.created_at.slice(0, 10)}.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível baixar as fotos.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Situação"
          className={selectClassName}
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as RequestFilters["status"] })}
        >
          <option value="active">Em aberto e em andamento</option>
          <option value="all">Todos</option>
          <option value="resolved">Resolvidos</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <select aria-label="Tipo de equipamento" className={selectClassName} value={filters.typeId} onChange={(event) => changeType(event.target.value)}>
          <option value="all">Todos os tipos</option>
          {types
            .filter((type) => equipment.some((item) => item.type_id === type.id))
            .map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Equipamento"
          className={selectClassName}
          value={filters.equipmentId}
          onChange={(event) => setFilters({ ...filters, equipmentId: event.target.value })}
        >
          <option value="all">Todos os equipamentos</option>
          {equipment.filter((item) => filters.typeId === "all" || item.type_id === filters.typeId).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select aria-label="Ordenar por" className={selectClassName} value={sort} onChange={(event) => changeSort(event.target.value)}>
          {requestSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Ordenar: {option.label}
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
          Só os meus
        </label>
      </div>

      {erro ? (
        <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      {visible.length === 0 ? (
        <Card>
          <p className="text-lg font-semibold text-muted">Nenhum chamado por aqui.</p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {visible.map((request) => {
            const actions = getRequestActions(request, profileId, canMaintainNow);
            const busy = busyId === request.id;
            return (
              <li key={request.id}>
                <Card className="grid gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-text">{request.equipment_name}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {request.requested_by_name ?? "Alguém"} · {formatMaintenanceDateTime(request.created_at, timezone)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge label={getMaintenanceUrgencyLabel(request.urgency)} variant={getMaintenanceUrgencyVariant(request.urgency)} />
                      <StatusBadge label={getMaintenanceRequestStatusLabel(request.status)} variant={getMaintenanceRequestStatusVariant(request.status)} />
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-base text-text">{request.description}</p>
                  {request.photo_paths.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {request.photo_paths.map((path, index) =>
                        photoUrls[path] ? (
                          <button
                            key={path}
                            type="button"
                            aria-label={`Ampliar foto ${index + 1}`}
                            className="rounded-lg transition hover:opacity-80"
                            onClick={() => setViewer({ request, index })}
                          >
                            <img src={photoUrls[path]} alt={`Foto ${index + 1} do chamado`} className="h-20 w-20 rounded-lg border border-border object-cover" />
                          </button>
                        ) : (
                          <div key={path} className="h-20 w-20 rounded-lg border border-border bg-background" />
                        ),
                      )}
                    </div>
                  ) : null}
                  {request.photo_paths.length > 1 ? (
                    <div>
                      <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={downloadingId === request.id} onClick={() => downloadPhotos(request)}>
                        {downloadingId === request.id ? "Preparando..." : `Baixar fotos (${request.photo_paths.length})`}
                      </Button>
                    </div>
                  ) : null}
                  {request.assigned_to_name ? (
                    <p className="text-sm text-muted">Responsável: {request.assigned_to_name}</p>
                  ) : null}
                  {request.resolution_notes ? (
                    <p className="rounded-lg border border-border bg-background p-3 text-sm text-text">
                      <span className="font-semibold">Solução:</span> {request.resolution_notes}
                    </p>
                  ) : null}
                  {linkedParts.some((part) => part.maintenance_request_id === request.id) ? (
                    <ul className="grid gap-1.5 rounded-lg border border-border bg-background p-3 text-sm">
                      {linkedParts
                        .filter((part) => part.maintenance_request_id === request.id)
                        .map((part) => (
                          <li key={part.id} className="flex flex-wrap items-center justify-between gap-2">
                            <Link to="/compras" className="min-w-0 break-words font-semibold text-primary underline">
                              Peça: {part.item}
                              {part.quantity > 1 ? ` × ${part.quantity}` : ""}
                            </Link>
                            <StatusBadge label={getPurchaseStatusLabel(part.status)} variant={getPurchaseStatusVariant(part.status)} />
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  {actions.take || actions.resolve || actions.giveBack || actions.cancel || actions.reopen || (canMaintainNow && isRequestActive(request.status)) ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {canMaintainNow && isRequestActive(request.status) ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => setPartFor(request)}>
                          <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                          Pedir peça
                        </Button>
                      ) : null}
                      {actions.take ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={busy} onClick={() => change(request, "in_progress")}>
                          Iniciar manutenção
                        </Button>
                      ) : null}
                      {actions.giveBack ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => change(request, "open")}>
                          Devolver à fila
                        </Button>
                      ) : null}
                      {actions.reopen ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => change(request, "open")}>
                          Reabrir
                        </Button>
                      ) : null}
                      {actions.cancel ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="ghost" disabled={busy} onClick={() => change(request, "cancelled")}>
                          Cancelar chamado
                        </Button>
                      ) : null}
                      {actions.resolve ? (
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => { setNotes(""); setReleaseToo(true); setResolving(request); }}>
                          Resolver
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

      {partFor ? (
        <PurchaseFormModal
          projects={projects}
          purchase={null}
          defaultProjectId={GENERAL_STOCK_VALUE}
          fromMaintenance={{
            requestId: partFor.id,
            equipmentName: partFor.equipment_name,
            description: partFor.description,
            urgency: partFor.urgency,
          }}
          onClose={() => setPartFor(null)}
          onDone={() => {
            setPartFor(null);
            window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
          }}
        />
      ) : null}

      {viewer ? (
        <PhotoViewer
          photos={viewer.request.photo_paths
            .filter((path) => photoUrls[path])
            .map((path, position) => ({ url: photoUrls[path], alt: `Foto ${position + 1} do chamado de ${viewer.request.equipment_name}` }))}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      ) : null}

      {resolving ? (
        <Modal
          title={`Resolver chamado: ${resolving.equipment_name}`}
          description="Registre o que foi feito, para consulta futura."
          onClose={() => setResolving(null)}
        >
          <form className="grid gap-4" onSubmit={resolve}>
            <p className="rounded-lg border border-border bg-background p-3 text-base text-text">{resolving.description}</p>
            <label className="grid gap-2 text-base font-semibold text-text">
              O que foi feito? (opcional)
              <textarea
                autoFocus
                className="min-h-24 min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            {resolving.status === "in_progress" && equipment.find((item) => item.id === resolving.equipment_id)?.status === "maintenance" ? (
              <label className="flex items-start gap-2 text-base font-semibold text-text">
                <input checked={releaseToo} className="mt-1 h-4 w-4 accent-primary" type="checkbox" onChange={(event) => setReleaseToo(event.target.checked)} />
                <span>
                  Liberar o equipamento também
                  <span className="block text-sm font-normal text-muted">Ele volta a aceitar reservas e a manutenção fica encerrada no histórico.</span>
                </span>
              </label>
            ) : null}
            {erro ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setResolving(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="success" disabled={busyId === resolving.id}>
                {busyId === resolving.id ? "Salvando..." : "Marcar como resolvido"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
