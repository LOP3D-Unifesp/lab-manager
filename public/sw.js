// Service worker do Lab Manager: recebe os avisos (Web Push) mesmo com o app fechado e os mostra.
// O servidor manda só o tipo e os dados do evento; o texto é montado aqui na língua do navegador.
// As linhas do corpo são as mesmas de src/lib/notificationAlert.ts (aviso com o app aberto): mude os dois juntos.

const TEXTS = {
  booking_pending: { pt: "Reserva aguardando aprovação", en: "Booking awaiting approval", es: "Reserva pendiente de aprobación" },
  booking_approved: { pt: "Reserva aprovada", en: "Booking approved", es: "Reserva aprobada" },
  booking_rejected: { pt: "Reserva recusada", en: "Booking rejected", es: "Reserva rechazada" },
  booking_cancelled: { pt: "Reserva cancelada", en: "Booking cancelled", es: "Reserva cancelada" },
  request_new: { pt: "Novo chamado de manutenção", en: "New maintenance request", es: "Nueva solicitud de mantenimiento" },
  request_urgent: { pt: "Chamado urgente", en: "Urgent maintenance request", es: "Solicitud urgente de mantenimiento" },
  request_resolved: { pt: "Chamado resolvido", en: "Maintenance request resolved", es: "Solicitud de mantenimiento resuelta" },
  feedback_new: { pt: "Nova sugestão", en: "New suggestion", es: "Nueva sugerencia" },
  purchase_new: { pt: "Novo pedido de compra", en: "New purchase request", es: "Nuevo pedido de compra" },
  purchase_urgent: { pt: "Pedido de compra urgente", en: "Urgent purchase request", es: "Pedido de compra urgente" },
  purchase_approved: { pt: "Pedido aprovado", en: "Request approved", es: "Pedido aprobado" },
  purchase_rejected: { pt: "Pedido recusado", en: "Request rejected", es: "Pedido rechazado" },
  purchase_purchased: { pt: "Pedido comprado", en: "Request purchased", es: "Pedido comprado" },
  purchase_delivered: { pt: "Pedido entregue", en: "Request delivered", es: "Pedido entregado" },
  request_open: { pt: "Chamado reaberto", en: "Maintenance request reopened", es: "Solicitud de mantenimiento reabierta" },
  request_in_progress: { pt: "Chamado em andamento", en: "Maintenance request in progress", es: "Solicitud de mantenimiento en curso" },
  request_waiting_part: { pt: "Chamado aguardando peça", en: "Maintenance request waiting for a part", es: "Solicitud de mantenimiento esperando una pieza" },
  request_cancelled: { pt: "Chamado cancelado", en: "Maintenance request cancelled", es: "Solicitud de mantenimiento cancelada" },
  request_updated: { pt: "Chamado atualizado", en: "Maintenance request updated", es: "Solicitud de mantenimiento actualizada" },
  purchase_cancelled: { pt: "Pedido cancelado", en: "Request cancelled", es: "Pedido cancelado" },
  purchase_reopened: { pt: "Pedido voltou para análise", en: "Request back under review", es: "Pedido de vuelta en análisis" },
  purchase_updated: { pt: "Pedido de compra atualizado", en: "Purchase request updated", es: "Pedido de compra actualizado" },
  project_join_request: { pt: "Pedido para entrar em projeto", en: "Request to join a project", es: "Solicitud para unirse a un proyecto" },
  project_join_approved: { pt: "Você entrou no projeto", en: "You joined the project", es: "Entraste al proyecto" },
  task_assigned: { pt: "Tarefa atribuída a você", en: "Task assigned to you", es: "Tarea asignada a ti" },
  task_timer_reminder: { pt: "Seu timer ainda está ligado", en: "Your timer is still on", es: "Tu temporizador sigue encendido" },
  project_join_rejected: { pt: "Pedido de entrada recusado", en: "Join request rejected", es: "Solicitud de ingreso rechazada" },
  task_todo: { pt: "Tarefa voltou para A fazer", en: "Task moved back to To do", es: "La tarea volvió a Por hacer" },
  task_in_progress: { pt: "Tarefa em andamento", en: "Task in progress", es: "Tarea en curso" },
  task_review: { pt: "Tarefa em revisão", en: "Task in review", es: "Tarea en revisión" },
  task_done: { pt: "Tarefa concluída", en: "Task completed", es: "Tarea concluida" },
  task_updated: { pt: "Tarefa atualizada", en: "Task updated", es: "Tarea actualizada" },
  task_comment: { pt: "Novo comentário em uma tarefa", en: "New comment on a task", es: "Nuevo comentario en una tarea" },
  task_reply: { pt: "Nova resposta em uma conversa", en: "New reply in a conversation", es: "Nueva respuesta en una conversación" },
  task_mention: { pt: "Mencionaram você em um comentário", en: "You were mentioned in a comment", es: "Te mencionaron en un comentario" },
  generic: { pt: "Nova notificação", en: "New notification", es: "Nueva notificación" },
};

function language() {
  const lang = (self.navigator.language || "pt").slice(0, 2).toLowerCase();
  return lang === "en" || lang === "es" ? lang : "pt";
}

function textKey(type, params) {
  if (type === "task_comment" && params.reply === true) return "task_reply";
  if (type === "request_new" && params.urgency === "urgent") return "request_urgent";
  if (type === "purchase_new" && params.urgency === "urgent") return "purchase_urgent";
  if (type === "purchase_status") {
    if (["approved", "rejected", "purchased", "delivered", "cancelled"].includes(params.status)) return "purchase_" + params.status;
    return params.status === "requested" ? "purchase_reopened" : "purchase_updated";
  }
  if (type === "project_join_decision") return params.approved === true ? "project_join_approved" : "project_join_rejected";
  if (type === "task_status") {
    return ["todo", "in_progress", "review", "done"].includes(params.status) ? "task_" + params.status : "task_updated";
  }
  if (type === "request_status") {
    if (params.status === "resolved") return "request_resolved";
    return ["open", "in_progress", "waiting_part", "cancelled"].includes(params.status) ? "request_" + params.status : "request_updated";
  }
  return TEXTS[type] ? type : "generic";
}

const WORDS = {
  by: { pt: "por {value}", en: "by {value}", es: "por {value}" },
  openedBy: { pt: "Aberto por {value}", en: "Opened by {value}", es: "Abierta por {value}" },
  due: { pt: "Prazo {value}", en: "Due {value}", es: "Plazo {value}" },
  solution: { pt: "Solução: {value}", en: "Solution: {value}", es: "Solución: {value}" },
  reason: { pt: "Motivo: {value}", en: "Reason: {value}", es: "Motivo: {value}" },
  stock: { pt: "Estoque geral", en: "General stock", es: "Stock general" },
  urgent: { pt: "Urgente", en: "Urgent", es: "Urgente" },
  high: { pt: "Alta", en: "High", es: "Alta" },
  taskAssignedBy: { pt: "{value} atribuiu uma tarefa a você", en: "{value} assigned a task to you", es: "{value} te asignó una tarea" },
  taskCommentBy: { pt: "{value} comentou em uma tarefa", en: "{value} commented on a task", es: "{value} comentó en una tarea" },
  taskReplyBy: { pt: "{value} respondeu em uma conversa", en: "{value} replied in a conversation", es: "{value} respondió en una conversación" },
  taskMentionBy: { pt: "{value} mencionou você em um comentário", en: "{value} mentioned you in a comment", es: "{value} te mencionó en un comentario" },
};

const LOCALES = { pt: "pt-BR", en: "en", es: "es" };

function word(key, value) {
  return WORDS[key][language()].replace("{value}", () => value);
}

function text(params, key) {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function join(...parts) {
  return parts.filter(Boolean).join(" · ") || null;
}

function byName(key, name) {
  return name ? word(key, name) : null;
}

function formatDay(date, timeZone) {
  return new Intl.DateTimeFormat(LOCALES[language()], { day: "2-digit", month: "2-digit", timeZone }).format(date);
}

function formatDueDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return formatDay(new Date(value + "T00:00:00Z"), "UTC");
}

function formatPeriod(params) {
  const start = new Date(text(params, "starts_at") || "");
  const end = new Date(text(params, "ends_at") || "");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const timeZone = text(params, "timezone") || "America/Sao_Paulo";
  const hour = new Intl.DateTimeFormat(LOCALES[language()], { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const startDay = formatDay(start, timeZone);
  const endDay = formatDay(end, timeZone);
  return startDay + " " + hour.format(start) + "–" + (startDay === endDay ? "" : endDay + " ") + hour.format(end);
}

function formatMoney(value) {
  return new Intl.NumberFormat(LOCALES[language()], { style: "currency", currency: "BRL" }).format(value);
}

// Até três linhas: o assunto, o contexto e um trecho do texto.
function bodyLines(type, params) {
  const reason = byName("reason", text(params, "reason"));

  if (type === "task_assigned" || type === "task_status" || type === "task_timer_reminder") {
    const due = formatDueDate(text(params, "due_on"));
    const priority = params.priority === "urgent" || params.priority === "high" ? WORDS[params.priority][language()] : null;
    return [
      text(params, "task"),
      join(text(params, "project"), type === "task_status" ? byName("by", text(params, "by")) : null, byName("due", due), priority),
      text(params, "description"),
    ];
  }

  if (type === "task_comment" || type === "task_mention") return [text(params, "task"), text(params, "project"), text(params, "description")];

  if (type === "request_new" || type === "request_status" || type === "request_resolved") {
    const solution = params.status === "resolved" ? text(params, "solution") : null;
    return [
      text(params, "equipment"),
      type === "request_new" ? byName("openedBy", text(params, "author")) : byName("by", text(params, "by")),
      solution ? word("solution", solution) : text(params, "description"),
    ];
  }

  if (type === "purchase_new" || type === "purchase_status") {
    const item = text(params, "item");
    const quantity = typeof params.quantity === "number" && params.quantity > 1 ? " × " + params.quantity : "";
    return [
      item ? item + quantity : null,
      join(
        typeof params.amount === "number" ? formatMoney(params.amount) : null,
        byName("by", text(params, type === "purchase_new" ? "author" : "by")),
        params.stock === true ? WORDS.stock[language()] : text(params, "project"),
      ),
      reason || (type === "purchase_new" ? text(params, "description") : null),
    ];
  }

  if (["booking_pending", "booking_approved", "booking_rejected", "booking_cancelled"].includes(type)) {
    const showAuthor = type === "booking_pending" || type === "booking_cancelled";
    return [
      text(params, "equipment"),
      join(formatPeriod(params), text(params, "project"), showAuthor ? text(params, "author") : null),
      reason,
    ];
  }

  if (type === "project_join_request") return [join(text(params, "requester"), text(params, "project")), text(params, "description")];
  if (type === "project_join_decision") return [text(params, "project"), byName("by", text(params, "by"))];
  if (type === "feedback_new") return [text(params, "author"), text(params, "description")];
  // Tipo criado depois desta versão do service worker: mostra o assunto com o que veio nos dados.
  return [text(params, "task") || text(params, "equipment") || text(params, "item"), text(params, "project"), text(params, "description")];
}

function describe(data) {
  const params = data.params && typeof data.params === "object" ? data.params : {};
  // Avisos cujo título diz quem fez a ação.
  const byWord = {
    task_assigned: "taskAssignedBy",
    task_comment: params.reply === true ? "taskReplyBy" : "taskCommentBy",
    task_mention: "taskMentionBy",
  }[data.type];
  const author = byWord ? text(params, "by") : null;
  const title = author ? word(byWord, author) : TEXTS[textKey(data.type, params)][language()];
  return { title, body: bodyLines(data.type, params).filter(Boolean).join("\n") };
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  async function show() {
    // Com o app aberto e em foco o sino já mostra a novidade; avisar de novo seria repetição.
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.some((client) => client.visibilityState === "visible" && client.focused)) return;

    const { body, title } = describe(data);
    await self.registration.showNotification(title, {
      body,
      tag: data.id || data.type || "lab-manager",
      data: { link: typeof data.link === "string" ? data.link : "/" },
    });
  }

  // Cada push também procura uma versão nova deste arquivo, para os textos não ficarem velhos em quem passa dias sem
  // abrir o app. A busca vem depois do aviso e uma falha nela não importa.
  event.waitUntil(show().finally(() => self.registration.update().catch(() => undefined)));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const base = self.registration.scope.replace(/\/$/, "");
  const link = (event.notification.data && event.notification.data.link) || "/";
  const target = base + (link.startsWith("/") ? link : "/" + link);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => client.url.startsWith(base));
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
