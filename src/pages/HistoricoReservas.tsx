import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge, type StatusVariant } from "../components/ui/StatusBadge";
import { getBookingStatusLabel, type BookingStatus, type PrinterBooking } from "../lib/domain";
import { listBookings } from "../lib/supabaseRepository";

const statusVariants: Record<BookingStatus, StatusVariant> = {
  pending: "warning",
  approved: "success",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
};

const statusFilterOptions: Array<{ value: BookingStatus | "all"; label: string }> = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovada" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
  { value: "rejected", label: "Rejeitada" },
  { value: "failed", label: "Falhou" },
];

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

export function HistoricoReservas() {
  const [bookings, setBookings] = useState<PrinterBooking[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<BookingStatus | "all">("all");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let ativo = true;

    listBookings()
      .then((data) => {
        if (ativo) setBookings(data);
      })
      .catch((error) => {
        if (ativo) setErro(error instanceof Error ? error.message : "Erro ao carregar o histórico.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const bookingsOrdenadas = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );
  }, [bookings]);

  const bookingsFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return bookingsOrdenadas.filter((reserva) => {
      if (statusFiltro !== "all" && reserva.status !== statusFiltro) {
        return false;
      }

      if (!termo) {
        return true;
      }

      return (
        reserva.project_name.toLowerCase().includes(termo) ||
        (reserva.profile?.full_name ?? "").toLowerCase().includes(termo) ||
        (reserva.printer?.name ?? "").toLowerCase().includes(termo)
      );
    });
  }, [bookingsOrdenadas, statusFiltro, busca]);

  return (
    <div>
      <PageHeader
        title="Histórico de reservas"
        description="Registro completo de reservas, incluindo as canceladas, para acompanhamento do laboratório."
      />

      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end">
        <label className="grid gap-2 text-base font-semibold text-text sm:w-56">
          Status
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
            onChange={(event) => setStatusFiltro(event.target.value as BookingStatus | "all")}
            value={statusFiltro}
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid flex-1 gap-2 text-base font-semibold text-text">
          Buscar
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Projeto, pesquisador ou impressora"
            type="text"
            value={busca}
          />
        </label>
      </section>

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary-soft p-3 text-primary">
            <History className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text">
              {bookingsFiltradas.length} {bookingsFiltradas.length === 1 ? "reserva" : "reservas"}
            </h2>
            <p className="mt-1 text-muted">Ordenado da mais recente para a mais antiga.</p>
          </div>
        </div>

        {carregando ? (
          <p className="text-base font-semibold text-muted">Carregando...</p>
        ) : bookingsFiltradas.length === 0 ? (
          <p className="text-base font-semibold text-muted">Nenhuma reserva encontrada com esses filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-background text-left">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-sm font-semibold text-muted">Data</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">Projeto</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">Pesquisador</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">Impressora</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsFiltradas.map((reserva) => (
                  <tr
                    key={reserva.id}
                    className="border-b border-border last:border-b-0 hover:bg-background/70"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-base text-muted">
                      {formatarDataHora(reserva.starts_at)}
                    </td>
                    <td className="px-4 py-3 text-base font-semibold text-text">
                      {reserva.project_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-base text-muted">
                      {reserva.profile?.full_name ?? "Usuário removido"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-base text-muted">
                      {reserva.printer?.name ?? "Impressora removida"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge
                        label={getBookingStatusLabel(reserva.status)}
                        variant={statusVariants[reserva.status]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
