import { getLocale, t } from "../i18n";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";

import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge, type StatusVariant } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import {
  getBookingStatusLabel,
  getTimezonePadrao,
  type BookingStatus,
  type EquipmentBooking,
} from "../lib/domain";
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
  { value: "all", get label() { return t("bookingsList.allStatuses"); } },
  { value: "pending", get label() { return t("bookingStatus.pending"); } },
  { value: "approved", get label() { return t("bookingStatus.approved"); } },
  { value: "in_progress", get label() { return t("bookingStatus.in_progress"); } },
  { value: "completed", get label() { return t("bookingStatus.completed"); } },
  { value: "cancelled", get label() { return t("bookingStatus.cancelled"); } },
  { value: "rejected", get label() { return t("bookingStatus.rejected"); } },
  { value: "failed", get label() { return t("bookingStatus.failed"); } },
];

export function MinhasReservas() {
  const { labSettings, profile } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
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
        if (ativo) setErro(error instanceof Error ? error.message : t("bookingsMine.errLoad"));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const minhasReservas = useMemo(() => {
    return bookings
      .filter((reserva) => reserva.profile_id === profile?.id)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }, [bookings, profile?.id]);

  const reservasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return minhasReservas.filter((reserva) => {
      if (statusFiltro !== "all" && reserva.status !== statusFiltro) {
        return false;
      }

      if (!termo) {
        return true;
      }

      return (
        reserva.project_name.toLowerCase().includes(termo) ||
        (reserva.equipment?.name ?? "").toLowerCase().includes(termo) ||
        (reserva.material?.name ?? "").toLowerCase().includes(termo)
      );
    });
  }, [minhasReservas, statusFiltro, busca]);

  const formatarDataHora = (valor: string) =>
    new Intl.DateTimeFormat(getLocale(), {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(valor));

  function detalhesDaReserva(reserva: EquipmentBooking) {
    const decisao =
      reserva.status === "approved" && reserva.approved_by_profile
        ? t("bookingsList.approvedBy", { name: reserva.approved_by_profile.full_name })
        : reserva.status === "rejected" && reserva.rejected_by_profile
          ? t("bookingsList.rejectedBy", { name: reserva.rejected_by_profile.full_name })
          : reserva.status === "cancelled" && reserva.cancelled_by_profile
            ? t("bookingsList.cancelledBy", { name: reserva.cancelled_by_profile.full_name })
            : null;
    const motivo =
      reserva.status === "rejected" && reserva.rejected_reason
        ? t("bookingsList.reason", { reason: reserva.rejected_reason })
        : reserva.notes;

    return [decisao, motivo].filter(Boolean).join(" · ") || "-";
  }

  return (
    <div>
      <PageHeader
        title={t("bookingsMine.title")}
        description={t("bookingsMine.subtitle")}
      />

      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end">
        <label className="grid gap-2 text-base font-semibold text-text sm:w-56">
          {t("bookingsList.status")}
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
          {t("bookingsList.search")}
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
            onChange={(event) => setBusca(event.target.value)}
            placeholder={t("bookingsMine.searchPlaceholder")}
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
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-text">
              {t("bookingsList.count", { count: reservasFiltradas.length })}
            </h2>
            <p className="mt-1 text-muted">{t("bookingsList.order")}</p>
          </div>
        </div>

        {carregando ? (
          <p className="text-base font-semibold text-muted">{t("bookingsList.loading")}</p>
        ) : reservasFiltradas.length === 0 ? (
          <p className="text-base font-semibold text-muted">
            {t("bookingsList.none")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead className="bg-background text-left">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-sm font-semibold text-muted">{t("bookingsList.colDate")}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">{t("bookingsList.colProject")}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">{t("bookingsList.colEquipment")}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">{t("bookingsList.colStatus")}</th>
                  <th className="px-4 py-3 text-sm font-semibold text-muted">{t("bookingsList.colDetails")}</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((reserva) => (
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
                      {reserva.equipment?.name ?? t("bookings.removedEquipment")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge
                        label={getBookingStatusLabel(reserva.status)}
                        variant={statusVariants[reserva.status]}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {detalhesDaReserva(reserva)}
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
