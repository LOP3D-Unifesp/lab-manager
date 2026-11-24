import { t } from "../../i18n";
import { Bell, BellOff, BellRing, CalendarCheck, CheckCheck, MessageSquare, ShoppingCart, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import {
  disableDesktopAlerts,
  enableDesktopAlerts,
  getDesktopAlertState,
  type DesktopAlertState,
} from "../../lib/desktopAlerts";
import type { AppNotification } from "../../lib/notifications";
import { NotificationItem } from "../ui/NotificationItem";
import { useAttention } from "./AttentionProvider";
import { NotificationRow } from "./NotificationRow";
import { useNotifications } from "./NotificationsProvider";

const PREVIEW_LIMIT = 5;

function SectionTitle({ children }: { children: string }) {
  return <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted">{children}</p>;
}

type NotificationBellProps = {
  align?: "left" | "right";
};

export function NotificationBell({ align = "right" }: NotificationBellProps) {
  const { profile } = useAuth();
  const { error, items, markAllRead, markRead, unread } = useNotifications();
  const attention = useAttention();
  const count = unread + attention.total;
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [desktopState, setDesktopState] = useState<DesktopAlertState>("unsupported");
  const containerRef = useRef<HTMLDivElement>(null);

  // Trabalho em aberto, contado direto das tabelas: some quando a pendência é resolvida.
  const pendencias = [
    {
      key: "reservas",
      total: attention.pendingBookings,
      to: "/reservas",
      icon: CalendarCheck,
      label: t("bell.bookingsWaiting", { count: attention.pendingBookings }),
      detail: null,
    },
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

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setDesktopState(getDesktopAlertState());

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  if (!profile) {
    return null;
  }

  function abrir(notification: AppNotification) {
    void markRead([notification.id]);
    setIsOpen(false);
  }

  async function ativarAvisos() {
    setDesktopState(await enableDesktopAlerts());
  }

  function desativarAvisos() {
    disableDesktopAlerts();
    setDesktopState(getDesktopAlertState());
  }

  const visiveis = showAll ? items : items.slice(0, PREVIEW_LIMIT);
  const tudoEmDia = pendencias.length === 0 && items.length === 0;

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
            "absolute top-[3.25rem] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface shadow-soft",
            align === "left" ? "left-0" : "right-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p className="text-base font-bold leading-tight text-text">{t("bell.title")}</p>
            {unread > 0 ? (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary transition hover:bg-primary-soft"
                onClick={() => void markAllRead()}
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                {t("bell.markAllRead")}
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(26rem,70vh)] overflow-y-auto pb-1">
            {tudoEmDia ? (
              <div className="px-3 py-4">
                <p className="text-sm font-semibold text-muted">{t("bell.allGood")}</p>
                {error ? <p className="mt-1 text-xs text-muted">{t("bell.errUpdate")}</p> : null}
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

            {items.length > 0 ? (
              <section>
                <SectionTitle>{t("bell.news")}</SectionTitle>
                <div className="grid gap-0.5 px-1.5">
                  {visiveis.map((notification) => (
                    <NotificationRow key={notification.id} notification={notification} onOpen={abrir} />
                  ))}
                  {items.length > PREVIEW_LIMIT ? (
                    <button
                      type="button"
                      className="min-h-9 rounded-md px-3 text-left text-sm font-semibold text-primary transition hover:bg-primary-soft"
                      onClick={() => setShowAll((current) => !current)}
                    >
                      {showAll ? t("bell.showLess") : t("bell.showMore")}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <div className="border-t border-border p-1.5">
            <Link
              to="/notificacoes"
              onClick={() => setIsOpen(false)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-base font-semibold text-primary transition hover:bg-primary-soft"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
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
                  <p className="text-xs text-muted">{t("bell.desktopBlocked")}</p>
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
