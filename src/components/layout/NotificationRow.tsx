import { Bell, CalendarCheck, CheckCircle2, ListChecks, MessageSquare, ShoppingCart, Timer, UserCheck, UserPlus, Wrench, XCircle, type LucideIcon } from "lucide-react";

import { getLocale, t } from "../../i18n";
import { describeNotification, type AppNotification, type NotificationType } from "../../lib/notifications";
import { formatRelativeTime } from "../../lib/relativeTime";
import { NotificationItem } from "../ui/NotificationItem";

const ICONS: Record<NotificationType, LucideIcon> = {
  booking_pending: CalendarCheck,
  booking_approved: CheckCircle2,
  booking_rejected: XCircle,
  booking_cancelled: XCircle,
  request_new: Wrench,
  request_resolved: CheckCircle2,
  request_status: Wrench,
  feedback_new: MessageSquare,
  purchase_new: ShoppingCart,
  purchase_status: ShoppingCart,
  project_join_request: UserPlus,
  project_join_decision: UserCheck,
  task_assigned: ListChecks,
  task_timer_reminder: Timer,
  task_status: ListChecks,
};

type NotificationRowProps = {
  notification: AppNotification;
  /** Chamado ao clicar, antes de navegar (marcar como lida, fechar o painel). */
  onOpen: (notification: AppNotification) => void;
};

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

// Uma notificação do histórico: texto na língua atual, ícone do tipo, tempo relativo e ponto de "nova".
export function NotificationRow({ notification, onOpen }: NotificationRowProps) {
  const { detail, reason, title } = describeNotification(notification);

  return (
    <NotificationItem
      to={notification.link ?? "/"}
      icon={ICONS[notification.type] ?? Bell}
      title={title}
      unread={!notification.read_at}
      time={formatRelativeTime(notification.created_at, getLocale()) || formatFullDate(notification.created_at)}
      onNavigate={() => onOpen(notification)}
    >
      {detail ? <span className="break-words text-muted">{detail}</span> : null}
      {reason ? <span className="truncate text-xs text-danger-dark">{t("bell.reason", { reason })}</span> : null}
    </NotificationItem>
  );
}
