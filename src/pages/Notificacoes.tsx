import { useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { NotificationRow } from "../components/layout/NotificationRow";
import { useNotifications } from "../components/layout/NotificationsProvider";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { t } from "../i18n";
import { getNotificationGroup, notificationGroups, type AppNotification, type NotificationGroup } from "../lib/notifications";

const GROUP_LABELS: Record<NotificationGroup, () => string> = {
  bookings: () => t("notifPage.group.bookings"),
  requests: () => t("notifPage.group.requests"),
  purchases: () => t("notifPage.group.purchases"),
  feedback: () => t("notifPage.group.feedback"),
};

const selectClassName =
  "min-h-11 min-w-0 rounded-lg border border-border bg-surface px-4 text-base outline-none transition focus:border-primary";

// Histórico completo das notificações da pessoa, com filtro por assunto e "só não lidas".
export function Notificacoes() {
  const { hasMore, items, loadMore, markAllRead, markRead, unread } = useNotifications();
  const navigate = useNavigate();
  const [group, setGroup] = useState<NotificationGroup | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const visible = useMemo(
    () => items.filter((item) => (group === "all" || getNotificationGroup(item.type) === group) && (!unreadOnly || !item.read_at)),
    [items, group, unreadOnly],
  );

  function abrir(notification: AppNotification) {
    void markRead([notification.id]);
    navigate(notification.link ?? "/");
  }

  return (
    <div>
      <PageHeader
        title={t("notifPage.title")}
        description={t("notifPage.subtitle")}
        action={
          unread > 0 ? (
            <Button variant="secondary" onClick={() => void markAllRead()}>
              <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("bell.markAllRead")}
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select aria-label={t("notifPage.title")} className={selectClassName} value={group} onChange={(event) => setGroup(event.target.value as NotificationGroup | "all")}>
          <option value="all">{t("notifPage.all")}</option>
          {notificationGroups.map((value) => (
            <option key={value} value={value}>
              {GROUP_LABELS[value]()}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-base font-semibold text-text">
          <input type="checkbox" className="h-4 w-4" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />
          {t("notifPage.unreadOnly")}
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t("notifPage.empty")}>{t("notifPage.emptyHint")}</EmptyState>
      ) : (
        <Card>
          <div className="grid gap-0.5">
            {visible.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} onOpen={abrir} />
            ))}
          </div>
        </Card>
      )}

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" onClick={() => void loadMore()}>
            <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("notifPage.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
