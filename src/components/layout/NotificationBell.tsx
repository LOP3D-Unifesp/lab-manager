import { getLocale, t } from "../../i18n";
import { Bell, BellOff, BellRing, CalendarCheck, CheckCircle2, MessageSquare, ShoppingCart, Wrench, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getBookingStatusLabel,
  getTimezonePadrao,
  type BookingAlertSummary,
  type BookingStatus,
} from "../../lib/domain";
import { useAuth } from "../../lib/auth";
import {
  disableDesktopAlerts,
  enableDesktopAlerts,
  getDesktopAlertState,
  type DesktopAlertState,
} from "../../lib/desktopAlerts";
import { useBookingsAlert } from "../../lib/pendingBookingsAlert";
import { getPurchaseStatusLabel, getPurchaseStatusVariant } from "../../lib/purchases";
import { StatusBadge, type StatusVariant } from "../ui/StatusBadge";
import { useAttention } from "./AttentionProvider";

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

function SectionTitle({ children }: { children: string }) {
  return <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">{children}</p>;
}

export function NotificationBell({ align = "right" }: NotificationBellProps) {
  const { profile, labSettings } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const isCoordinator = profile?.role === "coordinator";
  const { notifications, count: bookingCount, error, markSeen } = useBookingsAlert();
  const attention = useAttention();
  const count = bookingCount + attention.total;
  const [novos, setNovos] = useState<string[]>([]);
  const [desktopState, setDesktopState] = useState<DesktopAlertState>("unsupported");

  const pendencias = [
    {
      key: "chamados",
      total: attention.maintenanceRequests,
      to: "/equipamentos?vista=chamados",
      icon: Wrench,
      label: t("bell.openRequests", { count: attention.maintenanceRequests }),
      detail: attention.urgentRequests > 0 ? t("bell.urgent", { count: attention.urgentRequests }) : null,
    },
    {
      key: "compras",
      total: attention.purchases,
      to: "/compras",
      icon: ShoppingCart,
      label: t("bell.purchasesWaiting", { count: attention.purchases }),
      detail: attention.urgentPurchases > 0 ? t("bell.urgent", { count: attention.urgentPurchases }) : null,
    },
    {
      key: "feedback",
      total: attention.feedback,
      to: "/feedback",
      icon: MessageSquare,
      label: t("bell.newFeedback", { count: attention.feedback }),
      detail: null,
    },
  ].filter((item) => item.total > 0);

  const reservasTitulo = isCoordinator ? t("bell.bookingsAwaiting") : t("bell.yourBookings");
  const emptyMessage = isCoordinator ? t("bell.noPendingBookings") : t("bell.noBookingNews");
  const listaCompletaPath = isCoordinator ? "/reservas" : "/reservas/minhas";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatarDataHora = (valor: string) =>
    new Intl.DateTimeFormat(getLocale(), {
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
    // As novidades de compras já vistas somem do selo, mas continuam marcadas como novas enquanto o painel está aberto.
    setNovos(attention.unseenPurchaseUpdateIds);
    attention.markPurchaseUpdatesSeen();
    setDesktopState(getDesktopAlertState());

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

  async function ativarAvisos() {
    setDesktopState(await enableDesktopAlerts());
  }

  function desativarAvisos() {
    disableDesktopAlerts();
    setDesktopState(getDesktopAlertState());
  }

  const tudoEmDia = pendencias.length === 0 && notifications.length === 0 && attention.purchaseUpdates.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={count > 0 ? t("bell.titleCount", { count }) : t("bell.title")}
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
            "absolute top-[3.25rem] z-50 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-soft",
            align === "left" ? "left-0" : "right-0",
          ].join(" ")}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-base font-bold leading-tight text-text">{t("bell.title")}</p>
          </div>

          <div className="max-h-[min(26rem,70vh)] overflow-y-auto pb-1">
            {tudoEmDia ? (
              <div className="px-3 py-4">
                <p className="text-sm font-semibold text-muted">{t("bell.allGood")}</p>
                {error ? (
                  <p className="mt-1 text-xs text-muted">{t("bell.errUpdate")}</p>
                ) : null}
              </div>
            ) : null}

            {pendencias.length > 0 ? (
              <section>
                <SectionTitle>{t("bell.pending")}</SectionTitle>
                <div className="grid gap-0.5 px-1.5">
                  {pendencias.map((item) => (
                    <Link
                      key={item.key}
                      to={item.to}
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-text transition hover:bg-primary-soft"
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.detail ? (
                        <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">{item.detail}</span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {attention.purchaseUpdates.length > 0 ? (
              <section>
                <SectionTitle>{t("bell.myPurchases")}</SectionTitle>
                <div className="grid gap-1 px-1.5">
                  {attention.purchaseUpdates.slice(0, 5).map((update) => (
                    <Link
                      key={update.id}
                      to="/compras"
                      onClick={() => setIsOpen(false)}
                      className="rounded-md px-3 py-2 text-sm leading-tight transition hover:bg-primary-soft"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-bold text-text">{update.item}</p>
                        <StatusBadge label={getPurchaseStatusLabel(update.status)} variant={getPurchaseStatusVariant(update.status)} />
                      </div>
                      {update.status === "rejected" && update.rejected_reason ? (
                        <p className="mt-0.5 truncate text-xs text-danger-dark">{t("bell.reason", { reason: update.rejected_reason })}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-muted">
                        {formatarDataHora(update.updated_at)}
                        {novos.includes(update.id) ? t("bell.new") : ""}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {notifications.length > 0 ? (
              <section>
                <SectionTitle>{reservasTitulo}</SectionTitle>
                <div className="grid gap-1 px-1.5">
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
                          {notificacao.equipment_name}
                        </p>
                        <p className="mt-0.5 text-muted">
                          {formatarDataHora(notificacao.starts_at)}
                        </p>
                        {autor ? (
                          <p className="mt-0.5 text-xs text-muted">
                            {t("bell.statusBy", { status: getBookingStatusLabel(notificacao.status), name: autor })}
                          </p>
                        ) : null}
                        {notificacao.status === "rejected" && notificacao.rejected_reason ? (
                          <p className="mt-0.5 truncate text-xs text-danger-dark">
                            {t("bell.reason", { reason: notificacao.rejected_reason })}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : pendencias.length > 0 ? (
              <section>
                <SectionTitle>{reservasTitulo}</SectionTitle>
                <p className="px-3 pb-1 text-sm text-muted">{emptyMessage}</p>
              </section>
            ) : null}
          </div>

          <div className="border-t border-border p-1.5">
            <Link
              to={listaCompletaPath}
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-base font-semibold text-primary transition hover:bg-primary-soft"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              {t("bell.seeAll")}
            </Link>
            {desktopState !== "unsupported" ? (
              <div className="mt-1 border-t border-border px-3 py-2">
                {desktopState === "on" ? (
                  <button
                    type="button"
                    className="flex min-h-9 w-full items-center gap-2 text-left text-sm font-semibold text-muted transition hover:text-primary"
                    onClick={desativarAvisos}
                  >
                    <BellOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("bell.desktopOn")}
                  </button>
                ) : desktopState === "blocked" ? (
                  <p className="text-xs text-muted">
                    {t("bell.desktopBlocked")}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="flex min-h-9 w-full items-center gap-2 text-left text-sm font-semibold text-primary transition hover:underline"
                    onClick={ativarAvisos}
                  >
                    <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("bell.desktopEnable")}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
