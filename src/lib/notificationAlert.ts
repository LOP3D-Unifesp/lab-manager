import { getLocale, t } from "../i18n";
import type { AppNotification } from "./notifications";
import { formatCurrencyBRL, getTaskPriorityLabel } from "./projects";

// Corpo do aviso no computador: até três linhas (o assunto, o contexto e um trecho do texto). O service worker
// (public/sw.js) monta as mesmas linhas para o push; o teste de notificationAlert compara os dois.

type Params = Record<string, unknown>;

function text(params: Params, key: string) {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value : null;
}

const join = (...parts: Array<string | null>) => parts.filter(Boolean).join(" · ") || null;

function formatDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "2-digit", timeZone }).format(date);
}

function formatDueDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return formatDay(new Date(`${value}T00:00:00Z`), "UTC");
}

// "28/11 14:00–16:00", no fuso do laboratório; quando termina em outro dia, o dia do fim também aparece.
function formatPeriod(params: Params) {
  const start = new Date(text(params, "starts_at") ?? "");
  const end = new Date(text(params, "ends_at") ?? "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const timeZone = text(params, "timezone") ?? "America/Sao_Paulo";
  const hour = new Intl.DateTimeFormat(getLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const startDay = formatDay(start, timeZone);
  const endDay = formatDay(end, timeZone);
  return `${startDay} ${hour.format(start)}–${startDay === endDay ? "" : `${endDay} `}${hour.format(end)}`;
}

function by(name: string | null) {
  return name ? t("alert.by", { name }) : null;
}

function reasonLine(params: Params) {
  const reason = text(params, "reason");
  return reason ? t("bell.reason", { reason }) : null;
}

function lines(notification: Pick<AppNotification, "type" | "params">): Array<string | null> {
  const { params, type } = notification;

  if (type === "task_assigned" || type === "task_status" || type === "task_timer_reminder") {
    const due = formatDueDate(text(params, "due_on"));
    const priority = params.priority === "urgent" || params.priority === "high" ? getTaskPriorityLabel(params.priority) : null;
    return [
      text(params, "task"),
      join(
        text(params, "project"),
        type === "task_status" ? by(text(params, "by")) : null,
        due ? t("alert.due", { date: due }) : null,
        priority,
      ),
      text(params, "description"),
    ];
  }

  // Quem comentou já está no título; o trecho é o do comentário.
  if (type === "task_comment" || type === "task_mention") return [text(params, "task"), text(params, "project"), text(params, "description")];

  if (type === "request_new" || type === "request_status" || type === "request_resolved") {
    const author = text(params, "author");
    const solution = params.status === "resolved" ? text(params, "solution") : null;
    return [
      text(params, "equipment"),
      type === "request_new" ? (author ? t("alert.openedBy", { name: author }) : null) : by(text(params, "by")),
      solution ? t("alert.solution", { text: solution }) : text(params, "description"),
    ];
  }

  if (type === "purchase_new" || type === "purchase_status") {
    const item = text(params, "item");
    const quantity = typeof params.quantity === "number" && params.quantity > 1 ? ` × ${params.quantity}` : "";
    return [
      item ? `${item}${quantity}` : null,
      join(
        typeof params.amount === "number" ? formatCurrencyBRL(params.amount) : null,
        by(text(params, type === "purchase_new" ? "author" : "by")),
        params.stock === true ? t("purchases.generalStock") : text(params, "project"),
      ),
      reasonLine(params) ?? (type === "purchase_new" ? text(params, "description") : null),
    ];
  }

  if (type === "booking_pending" || type === "booking_approved" || type === "booking_rejected" || type === "booking_cancelled") {
    return [
      text(params, "equipment"),
      // Nos avisos para a coordenação (pendente ou cancelada pela pessoa) interessa de quem é a reserva.
      join(formatPeriod(params), text(params, "project"), type === "booking_pending" || type === "booking_cancelled" ? text(params, "author") : null),
      reasonLine(params),
    ];
  }

  if (type === "project_join_request") return [join(text(params, "requester"), text(params, "project")), text(params, "description")];
  if (type === "project_join_decision") return [text(params, "project"), by(text(params, "by"))];
  if (type === "feedback_new") return [text(params, "author"), text(params, "description")];
  return [];
}

export function describeAlertBody(notification: Pick<AppNotification, "type" | "params">) {
  return lines(notification).filter(Boolean).join("\n");
}
