import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Equipment } from "../../lib/domain";
import {
  filterRequests,
  getMaintenanceRequestStatusLabel,
  getMaintenanceRequestStatusVariant,
  getMaintenanceUrgencyLabel,
  getMaintenanceUrgencyVariant,
  getRequestActions,
  getRequestErrorMessage,
  sortRequests,
  type MaintenanceRequest,
  type MaintenanceRequestStatus,
  type RequestFilters,
} from "../../lib/maintenanceRequests";
import { formatMaintenanceDateTime } from "../../lib/maintenance";
import { getMaintenancePhotoUrls, setMaintenanceRequestStatus } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";
import { PhotoViewer } from "../ui/PhotoViewer";
import { StatusBadge } from "../ui/StatusBadge";

type PanelProps = {
  requests: MaintenanceRequest[];
  equipment: Equipment[];
  profileId: string | null;
  canMaintainNow: boolean;
  timezone: string;
  onChanged: () => Promise<void> | void;
};

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-base font-normal text-text outline-none transition focus:border-primary";

export function MaintenanceRequestsPanel({ canMaintainNow, equipment, onChanged, profileId, requests, timezone }: PanelProps) {
  const [filters, setFilters] = useState<RequestFilters>({ equipmentId: "all", status: "active", mine: false });
  const [resolving, setResolving] = useState<MaintenanceRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{ request: MaintenanceRequest; index: number } | null>(null);

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
    () => sortRequests(filterRequests(requests, filters, profileId)),
    [requests, filters, profileId],
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
    if (await change(resolving, "resolved", notes)) {
      setResolving(null);
      setNotes("");
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
        <select
          aria-label="Equipamento"
          className={selectClassName}
          value={filters.equipmentId}
          onChange={(event) => setFilters({ ...filters, equipmentId: event.target.value })}
        >
          <option value="all">Todos os equipamentos</option>
          {equipment.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
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
                  {request.assigned_to_name ? (
                    <p className="text-sm text-muted">Responsável: {request.assigned_to_name}</p>
                  ) : null}
                  {request.resolution_notes ? (
                    <p className="rounded-lg border border-border bg-background p-3 text-sm text-text">
                      <span className="font-semibold">Solução:</span> {request.resolution_notes}
                    </p>
                  ) : null}
                  {actions.take || actions.resolve || actions.giveBack || actions.cancel || actions.reopen ? (
                    <div className="flex flex-wrap justify-end gap-2">
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
                        <Button className="min-h-9 px-3 py-2 text-sm" variant="success" disabled={busy} onClick={() => { setNotes(""); setResolving(request); }}>
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
