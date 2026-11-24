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
import { formatRelativeTime } from "../../lib/relativeTime";
import { NotificationItem } from "../ui/NotificationItem";
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

const PREVIEW_LIMIT = 3;

function SectionTitle({ children }: { children: string }) {
  return <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">{children}</p>;
}

function ShowMoreButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  return (
    <button type="button" className="min-h-9 rounded-md px-3 text-left text-sm font-semibold text-primary transition hover:bg-primary-soft" onClick={onClick}>
      {expanded ? t("bell.showLess") : t("bell.showMore")}
    </button>
  );
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
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showAllPurchases, setShowAllPurchases] = useState(false);

  // Perto: "há 2 h". Depois de uma semana, a data.
  const tempoRelativo = (valor: string) => formatRelativeTime(valor, getLocale()) || formatarDataHora(valor);

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
                    <NotificationItem
                      key={item.key}
                      to={item.to}
                      icon={item.icon}
                      title={item.label}
                      badge={
                        item.detail ? (
                          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">{item.detail}</span>
                        ) : null
                      }
                      onNavigate={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {attention.purchaseUpdates.length > 0 ? (
              <section>
                <SectionTitle>{t("bell.myPurchases")}</SectionTitle>
                <div className="grid gap-1 px-1.5">
                  {(showAllPurchases ? attention.purchaseUpdates : attention.purchaseUpdates.slice(0, PREVIEW_LIMIT)).map((update) => (
                    <NotificationItem
                      key={update.id}
                      to="/compras"
                      icon={ShoppingCart}
                      title={update.item}
                      unread={novos.includes(update.id)}
                      badge={<StatusBadge label={getPurchaseStatusLabel(update.status)} variant={getPurchaseStatusVariant(update.status)} />}
                      time={tempoRelativo(update.updated_at)}
                      onNavigate={() => setIsOpen(false)}
                    >
                      {update.status === "rejected" && update.rejected_reason ? (
                        <span className="truncate text-xs text-danger-dark">{t("bell.reason", { reason: update.rejected_reason })}</span>
                      ) : null}
                    </NotificationItem>
                  ))}
                  {attention.purchaseUpdates.length > PREVIEW_LIMIT ? (
                    <ShowMoreButton expanded={showAllPurchases} onClick={() => setShowAllPurchases((current) => !current)} />
                  ) : null}
                </div>
              </section>
            ) : null}

            {notifications.length > 0 ? (
              <section>
                <SectionTitle>{reservasTitulo}</SectionTitle>
                <div className="grid gap-1 px-1.5">
                  {(showAllBookings ? notifications : notifications.slice(0, PREVIEW_LIMIT)).map((notificacao) => {
                    const autor = autorDaDecisao(notificacao);

                    return (
                      <NotificationItem
                        key={notificacao.id}
                        to={destinoDaNotificacao(notificacao)}
                        icon={statusIcons[notificacao.status] ?? CalendarCheck}
                        title={notificacao.project_name}
                        badge={<StatusBadge label={getBookingStatusLabel(notificacao.status)} variant={statusVariants[notificacao.status]} />}
                        onNavigate={() => setIsOpen(false)}
                      >
                        <span className="text-muted">
                          {notificacao.profile_name ? `${notificacao.profile_name} · ` : ""}
                          {notificacao.equipment_name}
                        </span>
                        <span className="text-muted">{formatarDataHora(notificacao.starts_at)}</span>
                        {autor ? (
                          <span className="text-xs text-muted">
                            {t("bell.statusBy", { status: getBookingStatusLabel(notificacao.status), name: autor })}
                          </span>
                        ) : null}
                        {notificacao.status === "rejected" && notificacao.rejected_reason ? (
                          <span className="truncate text-xs text-danger-dark">{t("bell.reason", { reason: notificacao.rejected_reason })}</span>
                        ) : null}
                      </NotificationItem>
                    );
                  })}
                  {notifications.length > PREVIEW_LIMIT ? (
                    <ShowMoreButton expanded={showAllBookings} onClick={() => setShowAllBookings((current) => !current)} />
                  ) : null}
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
