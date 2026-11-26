import { t } from "../i18n";
import type { ProfileRole } from "./domain";
import { describePurchaseUpdate, isNotifiablePurchaseStatus } from "./purchases";

export type NotificationType =
  | "booking_pending"
  | "booking_approved"
  | "booking_rejected"
  | "booking_cancelled"
  | "request_new"
  | "request_resolved"
  | "request_status"
  | "feedback_new"
  | "purchase_new"
  | "purchase_status"
  | "project_join_request"
  | "project_join_decision"
  | "task_assigned"
  | "task_timer_reminder"
  | "task_status"
  | "task_comment"
  | "task_mention";

export type AppNotification = {
  id: string;
  type: NotificationType;
  params: Record<string, unknown>;
  link: string | null;
  entity_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type NotificationGroup = "bookings" | "requests" | "purchases" | "feedback" | "projects" | "tasks";

export const notificationGroups: NotificationGroup[] = ["bookings", "requests", "purchases", "feedback", "projects", "tasks"];

type Audience = { role: ProfileRole; is_maintainer?: boolean } | null | undefined;

// Só os coordenadores recebem sugestões; os demais assuntos valem para qualquer pessoa.
export function getVisibleNotificationGroups(profile: Audience): NotificationGroup[] {
  return notificationGroups.filter((group) => group !== "feedback" || profile?.role === "coordinator");
}

// Texto das preferências conforme o que cada perfil de fato recebe (ver os gatilhos de notificação no banco).
export function getNotificationHintKey(group: NotificationGroup, profile: Audience) {
  const coordinator = profile?.role === "coordinator";
  if (group === "requests") {
    if (profile?.is_maintainer) return "notifPrefs.requestsHintMaintainer" as const;
    return coordinator ? ("notifPrefs.requestsHintCoordinator" as const) : ("notifPrefs.requestsHint" as const);
  }
  if (group === "bookings") return coordinator ? ("notifPrefs.bookingsHintCoordinator" as const) : ("notifPrefs.bookingsHint" as const);
  if (group === "purchases") return coordinator ? ("notifPrefs.purchasesHintCoordinator" as const) : ("notifPrefs.purchasesHint" as const);
  if (group === "projects") return coordinator ? ("notifPrefs.projectsHintCoordinator" as const) : ("notifPrefs.projectsHint" as const);
  if (group === "tasks") return "notifPrefs.tasksHint" as const;
  return "notifPrefs.feedbackHint" as const;
}

// Pendências da campainha: um assunto desligado em "No sino" sai da lista e da contagem. Sem escolha salva, aparece.
export function filterByBellPreference<T extends { topic: NotificationGroup }>(items: T[], preferences: Array<{ topic: NotificationGroup; in_app: boolean }>) {
  return items.filter((item) => preferences.find((preference) => preference.topic === item.topic)?.in_app !== false);
}

const GROUP_BY_TYPE: Record<NotificationType, NotificationGroup> = {
  booking_pending: "bookings",
  booking_approved: "bookings",
  booking_rejected: "bookings",
  booking_cancelled: "bookings",
  request_new: "requests",
  request_resolved: "requests",
  request_status: "requests",
  feedback_new: "feedback",
  purchase_new: "purchases",
  purchase_status: "purchases",
  project_join_request: "projects",
  project_join_decision: "projects",
  task_assigned: "tasks",
  task_timer_reminder: "tasks",
  task_status: "tasks",
  task_comment: "tasks",
  task_mention: "tasks",
};

export function getNotificationGroup(type: NotificationType): NotificationGroup {
  return GROUP_BY_TYPE[type];
}

export function getNotificationTypesOfGroup(group: NotificationGroup): NotificationType[] {
  return (Object.keys(GROUP_BY_TYPE) as NotificationType[]).filter((type) => GROUP_BY_TYPE[type] === group);
}

function text(params: Record<string, unknown>, key: string) {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value : null;
}

// Monta o texto na língua de quem lê: o banco guarda só o tipo e os dados do evento.
export function describeNotification(notification: Pick<AppNotification, "type" | "params">): { title: string; detail: string | null; reason: string | null } {
  const { params, type } = notification;
  const where = [text(params, "project"), text(params, "equipment")].filter(Boolean).join(" · ") || null;

  switch (type) {
    case "booking_pending":
      return { title: t("notif.bookingPending"), detail: where, reason: null };
    case "booking_approved":
      return { title: t("notif.bookingApproved"), detail: where, reason: null };
    case "booking_rejected":
      return { title: t("notif.bookingRejected"), detail: where, reason: text(params, "reason") };
    case "booking_cancelled":
      return { title: t("notif.bookingCancelled"), detail: where, reason: null };
    case "request_new":
      return {
        title: params.urgency === "urgent" ? t("notif.requestUrgent") : t("notif.requestNew"),
        detail: text(params, "equipment"),
        reason: null,
      };
    case "request_resolved":
      return { title: t("notif.requestResolved"), detail: text(params, "equipment"), reason: null };
    case "request_status": {
      const status = text(params, "status");
      const known = ["open", "in_progress", "waiting_part", "resolved", "cancelled"];
      return {
        title: status && known.includes(status) ? t(`notif.request.${status}` as Parameters<typeof t>[0]) : t("notif.requestUpdated"),
        detail: text(params, "equipment"),
        reason: null,
      };
    }
    case "feedback_new":
      return { title: t("notif.feedbackNew"), detail: null, reason: null };
    case "purchase_new":
      return {
        title: params.urgency === "urgent" ? t("alert.urgentPurchase") : t("alert.newPurchase"),
        detail: text(params, "item"),
        reason: null,
      };
    case "project_join_request":
      return {
        title: t("notif.projectJoinRequest"),
        detail: [text(params, "requester"), text(params, "project")].filter(Boolean).join(" · ") || null,
        reason: null,
      };
    case "task_assigned":
      return {
        title: text(params, "by") ? t("notif.taskAssignedBy", { name: text(params, "by") as string }) : t("notif.taskAssigned"),
        detail: [text(params, "task"), text(params, "project")].filter(Boolean).join(" · ") || null,
        reason: null,
      };
    case "task_comment":
    case "task_mention": {
      const by = text(params, "by");
      const mention = type === "task_mention";
      return {
        title: by
          ? t(mention ? "notif.taskMentionBy" : "notif.taskCommentBy", { name: by })
          : t(mention ? "notif.taskMention" : "notif.taskComment"),
        detail: [text(params, "task"), text(params, "project")].filter(Boolean).join(" · ") || null,
        reason: null,
      };
    }
    case "task_status": {
      const status = text(params, "status");
      const known = ["todo", "in_progress", "review", "done"];
      return {
        title: status && known.includes(status) ? t(`notif.task.${status}` as Parameters<typeof t>[0]) : t("notif.taskUpdated"),
        detail: [text(params, "task"), text(params, "project")].filter(Boolean).join(" · ") || null,
        reason: null,
      };
    }
    case "task_timer_reminder":
      return {
        title: t("notif.taskTimerReminder", { hours: typeof params.hours === "number" ? params.hours : 4 }),
        detail: [text(params, "task"), text(params, "project")].filter(Boolean).join(" · ") || null,
        reason: null,
      };
    case "project_join_decision":
      return {
        title: params.approved === true ? t("notif.projectJoinApproved") : t("notif.projectJoinRejected"),
        detail: text(params, "project"),
        reason: null,
      };
    case "purchase_status": {
      const status = text(params, "status");
      const item = text(params, "item");
      if (status && isNotifiablePurchaseStatus(status) && item) {
        return { title: describePurchaseUpdate({ item, status, rejected_reason: null }).title, detail: item, reason: text(params, "reason") };
      }
      if (status === "cancelled") return { title: t("notif.purchaseCancelled"), detail: item, reason: null };
      if (status === "requested") return { title: t("notif.purchaseReopened"), detail: item, reason: null };
      return { title: t("notif.purchaseStatus"), detail: item, reason: null };
    }
    // Tipo criado depois desta versão do app (aba aberta desde antes de uma atualização): mostra um texto genérico.
    default:
      return { title: t("notif.generic"), detail: null, reason: null };
  }
}
