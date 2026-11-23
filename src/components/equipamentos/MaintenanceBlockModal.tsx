import { FormEvent, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { criarDataNoFuso, getHojeNoFuso, getMensagemErroReserva, type Equipment, type MaintenanceBlock } from "../../lib/domain";
import {
  findBookingConflicts,
  getBlockState,
  getRelevantBlocks,
  validateMaintenanceInterval,
  type BookingSlot,
} from "../../lib/maintenance";
import { createMaintenanceBlock, deleteMaintenanceBlock, listActiveBookingsForEquipment } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { StatusBadge } from "../ui/StatusBadge";

const inputClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary";

function formatDateTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type MaintenanceBlockModalProps = {
  equipment: Equipment;
  blocks: MaintenanceBlock[];
  timezone: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
};

export function MaintenanceBlockModal({ blocks, equipment, onChanged, onClose, timezone }: MaintenanceBlockModalProps) {
  const today = getHojeNoFuso(timezone);
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [bookings, setBookings] = useState<BookingSlot[]>([]);
  const [conflicts, setConflicts] = useState<BookingSlot[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const now = new Date();
  const relevantes = useMemo(() => getRelevantBlocks(blocks, new Date()), [blocks]);

  useEffect(() => {
    let ativo = true;
    listActiveBookingsForEquipment(equipment.id)
      .then((data) => ativo && setBookings(data))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [equipment.id]);

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConflicts([]);
    const start = criarDataNoFuso(startDate, startTime, timezone);
    const end = criarDataNoFuso(endDate, endTime, timezone);

    const invalido = validateMaintenanceInterval(start, end, new Date());
    if (invalido) {
      setErro(invalido);
      return;
    }
    if (!reason.trim()) {
      setErro("Informe o motivo do bloqueio.");
      return;
    }

    // Avisa antes de enviar: o banco recusa bloquear sobre reservas, e quem decide é o coordenador.
    const sobrepostas = findBookingConflicts(bookings, start as Date, end as Date);
    if (sobrepostas.length > 0) {
      setConflicts(sobrepostas);
      setErro("Há reservas nesse período. Cancele ou remaneje as reservas antes de bloquear.");
      return;
    }

    try {
      setSalvando(true);
      setErro("");
      await createMaintenanceBlock({
        equipmentId: equipment.id,
        startsAt: (start as Date).toISOString(),
        endsAt: (end as Date).toISOString(),
        reason: reason.trim(),
        notes: notes.trim() || null,
      });
      setReason("");
      setNotes("");
      await onChanged();
    } catch (error) {
      setErro(getMensagemErroReserva(error));
    } finally {
      setSalvando(false);
    }
  }

  async function remover(block: MaintenanceBlock) {
    if (!window.confirm(`Remover o bloqueio "${block.reason}"?`)) return;
    try {
      setSalvando(true);
      setErro("");
      await deleteMaintenanceBlock(block.id);
      await onChanged();
    } catch (error) {
      setErro(getMensagemErroReserva(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={`Manutenção de ${equipment.name}`}
      description="Bloqueie um período em que o equipamento não pode ser reservado. Pode durar vários dias."
      onClose={onClose}
      wide
    >
      <div className="grid gap-6">
        <section aria-label="Bloqueios agendados" className="grid gap-2">
          <h4 className="text-lg font-bold text-text">Bloqueios agendados</h4>
          {relevantes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-background p-3 text-base text-muted">
              Nenhum bloqueio em curso ou futuro.
            </p>
          ) : (
            <ul className="grid gap-2">
              {relevantes.map((block) => (
                <li
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-text">{block.reason}</p>
                    <p className="text-sm text-muted">
                      {formatDateTime(block.starts_at, timezone)} até {formatDateTime(block.ends_at, timezone)}
                      {block.notes ? ` · ${block.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge
                      label={getBlockState(block, now) === "active" ? "Em curso" : "Agendado"}
                      variant={getBlockState(block, now) === "active" ? "warning" : "info"}
                    />
                    <button
                      type="button"
                      title="Remover bloqueio"
                      aria-label={`Remover bloqueio ${block.reason}`}
                      disabled={salvando}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark disabled:opacity-50"
                      onClick={() => remover(block)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form className="grid gap-4" onSubmit={criar}>
          <h4 className="text-lg font-bold text-text">Novo bloqueio</h4>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-base font-semibold text-text">Início</span>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input aria-label="Data de início" className={inputClassName} required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input aria-label="Hora de início" className={inputClassName} required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <span className="text-base font-semibold text-text">Fim</span>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input aria-label="Data de fim" className={inputClassName} required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <input aria-label="Hora de fim" className={inputClassName} required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <label className="grid gap-2 text-base font-semibold text-text">
            Motivo
            <input
              className={inputClassName}
              placeholder="Ex.: troca do bico e calibração"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            Observações (opcional)
            <textarea className={`${inputClassName} min-h-20 py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {conflicts.length > 0 ? (
            <ul className="grid gap-1 rounded-lg border border-warning-dark bg-warning-soft p-3 text-base text-text">
              {conflicts.map((booking) => (
                <li key={booking.id}>
                  <span className="font-semibold">{booking.project_name}</span>
                  {booking.person ? ` · ${booking.person}` : ""} · {formatDateTime(booking.starts_at, timezone)} até{" "}
                  {formatDateTime(booking.ends_at, timezone)}
                </li>
              ))}
            </ul>
          ) : null}

          {erro ? (
            <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar bloqueio"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
