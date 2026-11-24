import { FormEvent, useEffect, useMemo, useState } from "react";

import type { Equipment } from "../../lib/domain";
import { formatMaintenanceDateTime, getMaintenanceErrorMessage, splitAffectedBookings, type BookingSlot } from "../../lib/maintenance";
import { listActiveBookingsForEquipment, startEquipmentMaintenance } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { inputClassName } from "../ui/formStyles";

function BookingList({ bookings, timezone }: { bookings: BookingSlot[]; timezone: string }) {
  return (
    <ul className="grid gap-1 text-base text-text">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <span className="font-semibold">{booking.project_name}</span>
          {booking.person ? ` · ${booking.person}` : ""} · {formatMaintenanceDateTime(booking.starts_at, timezone)} até{" "}
          {formatMaintenanceDateTime(booking.ends_at, timezone)}
        </li>
      ))}
    </ul>
  );
}

type StartMaintenanceModalProps = {
  equipment: Equipment;
  timezone: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
};

// O equipamento entra em manutenção agora e fica assim até ser liberado; a previsão de volta é só um aviso.
export function StartMaintenanceModal({ equipment, onClose, onDone, timezone }: StartMaintenanceModalProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [bookings, setBookings] = useState<BookingSlot[] | null>(null);
  const [cancelar, setCancelar] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    listActiveBookingsForEquipment(equipment.id)
      .then((data) => ativo && setBookings(data))
      .catch(() => ativo && setBookings([]));
    return () => {
      ativo = false;
    };
  }, [equipment.id]);

  const { cancellable, running } = useMemo(() => splitAffectedBookings(bookings ?? [], new Date()), [bookings]);

  async function confirmar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setErro("Informe o motivo da manutenção.");
      return;
    }
    try {
      setSalvando(true);
      setErro("");
      await startEquipmentMaintenance({
        equipmentId: equipment.id,
        reason: reason.trim(),
        notes: notes.trim() || null,
        expectedReturnOn: expectedReturn || null,
        cancelBookings: cancelar && cancellable.length > 0,
      });
      await onDone();
    } catch (error) {
      setErro(getMaintenanceErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={`Colocar ${equipment.name} em manutenção`}
      description="O equipamento deixa de aceitar novas reservas agora e volta quando alguém clicar em Liberar. Não é preciso saber quando termina."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={confirmar}>
        <label className="grid gap-2 text-base font-semibold text-text">
          Motivo
          <input
            autoFocus
            className={inputClassName}
            placeholder="Ex.: troca do bico e calibração"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          Previsão de volta (opcional)
          <input className={inputClassName} type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
          <span className="text-sm font-normal text-muted">Só informativa: aparece no card, mas não libera nem bloqueia nada.</span>
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          Observações (opcional)
          <textarea className={`${inputClassName} min-h-20 py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {cancellable.length > 0 ? (
          <div className="grid gap-3 rounded-lg border border-warning-dark bg-warning-soft p-4">
            <p className="text-base font-semibold text-text">
              {cancellable.length === 1 ? "Há 1 reserva futura neste equipamento:" : `Há ${cancellable.length} reservas futuras neste equipamento:`}
            </p>
            <BookingList bookings={cancellable} timezone={timezone} />
            <label className="flex items-start gap-2 text-base font-semibold text-text">
              <input checked={cancelar} className="mt-1 h-4 w-4 accent-primary" type="checkbox" onChange={(e) => setCancelar(e.target.checked)} />
              Cancelar essas reservas ao colocar em manutenção
            </label>
            {!cancelar ? (
              <p className="text-sm text-muted">Sem marcar, elas ficam como estão e você precisa tratá-las depois, uma a uma.</p>
            ) : null}
          </div>
        ) : null}

        {running.length > 0 ? (
          <div className="grid gap-2 rounded-lg border border-border bg-background p-4">
            <p className="text-base font-semibold text-text">Em andamento agora (não são canceladas automaticamente):</p>
            <BookingList bookings={running} timezone={timezone} />
          </div>
        ) : null}

        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando || bookings === null}>
            {salvando ? "Salvando..." : "Colocar em manutenção"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
