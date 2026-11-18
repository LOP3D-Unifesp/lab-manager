import { Bell, CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getBookingStatusLabel,
  getTimezonePadrao,
  type BookingAlertSummary,
  type BookingStatus,
} from "../../lib/domain";
import { useAuth } from "../../lib/auth";
import { useBookingsAlert } from "../../lib/pendingBookingsAlert";
import { StatusBadge, type StatusVariant } from "../ui/StatusBadge";

const statusVariants: Record<BookingStatus, StatusVariant> = {
  pending: "warning",
  approved: "success",
  in_progress: "info",
  completed: "success",
  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
};

const statusIcons: Partial<Record<BookingStatus, typeof CheckCircle2>> = {
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
};

type NotificationBellProps = {
  align?: "left" | "right";
};

export function NotificationBell({ align = "right" }: NotificationBellProps) {
  const { profile, labSettings } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const isCoordinator = profile?.role === "coordinator";
  const { notifications, count, error, markSeen } = useBookingsAlert();

  const title = isCoordinator
    ? "Reservas aguardando aprovação"
    : "Atualizações das suas reservas";
  const emptyMessage = isCoordinator
    ? "Nenhuma reserva pendente no momento."
    : "Nenhuma novidade nas suas reservas.";
  const listaCompletaPath = isCoordinator ? "/reservas" : "/reservas/minhas";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatarDataHora = (valor: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(valor));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Opening the panel counts as reading the outcome notifications,
    // clearing the unseen part of the badge.
    markSeen();

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!profile) {
    return null;
  }

  function destinoDaNotificacao(notificacao: BookingAlertSummary) {
    if (!isCoordinator) {
      return "/reservas/minhas";
    }
    return notificacao.status === "cancelled"
      ? "/reservas/historico"
      : `/reservas?reserva=${notificacao.id}`;
  }

  function autorDaDecisao(notificacao: BookingAlertSummary) {
    if (notificacao.status === "approved") return notificacao.approved_by_name;
    if (notificacao.status === "rejected") return notificacao.rejected_by_name;
    if (notificacao.status === "cancelled") return notificacao.cancelled_by_name;
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={title}
        onClick={() => setIsOpen((current) => !current)}
        className={[
          "relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
          isOpen
            ? "border-primary bg-primary text-white shadow-soft"
            : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
        ].join(" ")}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-surface bg-danger px-1 text-xs font-bold text-white"
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={[
            "absolute top-[3.25rem] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-soft",
            align === "left" ? "left-0" : "right-0",
          ].join(" ")}
        >
          <div className="border-b border-border p-3">
            <p className="text-base font-bold leading-tight text-text">{title}</p>
          </div>

          {notifications.length === 0 ? (
            <div className="p-3">
              <p className="text-sm font-semibold text-muted">{emptyMessage}</p>
              {error ? (
                <p className="mt-1 text-xs text-muted">
                  Não foi possível atualizar as notificações agora.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid max-h-72 gap-1 overflow-y-auto p-1.5">
              {notifications.slice(0, 5).map((notificacao) => {
                const IconeStatus = statusIcons[notificacao.status];
                const destino = destinoDaNotificacao(notificacao);
                const autor = autorDaDecisao(notificacao);

                return (
                  <Link
                    key={notificacao.id}
                    to={destino}
                    onClick={() => setIsOpen(false)}
                    className="rounded-md px-3 py-2 text-sm leading-tight transition hover:bg-primary-soft"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-text">{notificacao.project_name}</p>
                      <StatusBadge
                        label={getBookingStatusLabel(notificacao.status)}
                        variant={statusVariants[notificacao.status]}
                      />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-muted">
                      {IconeStatus ? (
                        <IconeStatus className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : null}
                      {notificacao.profile_name ? `${notificacao.profile_name} · ` : ""}
                      {notificacao.printer_name}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {formatarDataHora(notificacao.starts_at)}
                    </p>
                    {autor ? (
                      <p className="mt-0.5 text-xs text-muted">
                        {getBookingStatusLabel(notificacao.status)} por {autor}
                      </p>
                    ) : null}
                    {notificacao.status === "rejected" && notificacao.rejected_reason ? (
                      <p className="mt-0.5 truncate text-xs text-danger-dark">
                        Motivo: {notificacao.rejected_reason}
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="p-1.5">
            <Link
              to={listaCompletaPath}
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-base font-semibold text-primary transition hover:bg-primary-soft"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Ver todas
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
