import { t } from "../i18n";
import { describePurchaseUpdate, isNotifiablePurchaseStatus } from "./purchases";

export type NotificationType =
  | "booking_pending"
  | "booking_approved"
  | "booking_rejected"
  | "booking_cancelled"
  | "request_new"
  | "request_resolved"
  | "feedback_new"
  | "purchase_new"
  | "purchase_status";

export type AppNotification = {
  id: string;
  type: NotificationType;
  params: Record<string, unknown>;
  link: string | null;
  entity_id: string | null;
  created_at: string;
  read_at: string | null;
};

export type NotificationGroup = "bookings" | "requests" | "purchases" | "feedback";

export const notificationGroups: NotificationGroup[] = ["bookings", "requests", "purchases", "feedback"];

const GROUP_BY_TYPE: Record<NotificationType, NotificationGroup> = {
  booking_pending: "bookings",
  booking_approved: "bookings",
  booking_rejected: "bookings",
  booking_cancelled: "bookings",
  request_new: "requests",
  request_resolved: "requests",
  feedback_new: "feedback",
  purchase_new: "purchases",
  purchase_status: "purchases",
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
    case "feedback_new":
      return { title: t("notif.feedbackNew"), detail: null, reason: null };
    case "purchase_new":
      return {
        title: params.urgency === "urgent" ? t("alert.urgentPurchase") : t("alert.newPurchase"),
        detail: text(params, "item"),
        reason: null,
      };
    case "purchase_status": {
      const status = text(params, "status");
      const item = text(params, "item");
      if (status && isNotifiablePurchaseStatus(status) && item) {
        return { title: describePurchaseUpdate({ item, status, rejected_reason: null }).title, detail: item, reason: text(params, "reason") };
      }
      return { title: t("notif.purchaseStatus"), detail: item, reason: null };
    }
  }
}
