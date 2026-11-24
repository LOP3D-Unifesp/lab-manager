// Service worker do Lab Manager: recebe os avisos (Web Push) mesmo com o app fechado e os mostra.
// O servidor manda só o tipo e os dados do evento; o texto é montado aqui na língua do navegador.

const TEXTS = {
  booking_pending: { pt: "Reserva aguardando aprovação", en: "Booking awaiting approval", es: "Reserva pendiente de aprobación" },
  booking_approved: { pt: "Reserva aprovada", en: "Booking approved", es: "Reserva aprobada" },
  booking_rejected: { pt: "Reserva recusada", en: "Booking rejected", es: "Reserva rechazada" },
  booking_cancelled: { pt: "Reserva cancelada", en: "Booking cancelled", es: "Reserva cancelada" },
  request_new: { pt: "Novo chamado de manutenção", en: "New maintenance request", es: "Nueva solicitud de mantenimiento" },
  request_urgent: { pt: "Chamado urgente", en: "Urgent maintenance request", es: "Solicitud urgente de mantenimiento" },
  request_resolved: { pt: "Chamado resolvido", en: "Maintenance request resolved", es: "Solicitud de mantenimiento resuelta" },
  feedback_new: { pt: "Novo feedback", en: "New feedback", es: "Nuevo comentario" },
  purchase_new: { pt: "Novo pedido de compra", en: "New purchase request", es: "Nuevo pedido de compra" },
  purchase_urgent: { pt: "Pedido de compra urgente", en: "Urgent purchase request", es: "Pedido de compra urgente" },
  purchase_approved: { pt: "Pedido aprovado", en: "Request approved", es: "Pedido aprobado" },
  purchase_rejected: { pt: "Pedido recusado", en: "Request rejected", es: "Pedido rechazado" },
  purchase_purchased: { pt: "Pedido comprado", en: "Request purchased", es: "Pedido comprado" },
  purchase_delivered: { pt: "Pedido entregue", en: "Request delivered", es: "Pedido entregado" },
  generic: { pt: "Nova notificação", en: "New notification", es: "Nueva notificación" },
};

function language() {
  const lang = (self.navigator.language || "pt").slice(0, 2).toLowerCase();
  return lang === "en" || lang === "es" ? lang : "pt";
}

function textKey(type, params) {
  if (type === "request_new" && params.urgency === "urgent") return "request_urgent";
  if (type === "purchase_new" && params.urgency === "urgent") return "purchase_urgent";
  if (type === "purchase_status" && ["approved", "rejected", "purchased", "delivered"].includes(params.status)) {
    return "purchase_" + params.status;
  }
  return TEXTS[type] ? type : "generic";
}

function describe(data) {
  const params = data.params && typeof data.params === "object" ? data.params : {};
  const title = TEXTS[textKey(data.type, params)][language()];
  const detail = [params.project, params.equipment, params.item].filter((value) => typeof value === "string" && value);
  return { title, body: detail.join(" · ") };
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

  event.waitUntil(
    (async () => {
      // Com o app aberto e em foco o sino já mostra a novidade; avisar de novo seria repetição.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (windows.some((client) => client.visibilityState === "visible" && client.focused)) return;

      const { body, title } = describe(data);
      await self.registration.showNotification(title, {
        body,
        tag: data.id || data.type || "lab-manager",
        data: { link: typeof data.link === "string" ? data.link : "/" },
      });
    })(),
  );
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
