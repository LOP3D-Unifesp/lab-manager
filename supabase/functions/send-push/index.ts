// Entrega um aviso (Web Push) às assinaturas de quem recebeu uma notificação nova.
// Chamada pelo banco (trigger `notifications_send_push`) com o segredo compartilhado no cabeçalho `x-push-secret`.
// Segredos da função: PUSH_WEBHOOK_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (ex.: mailto:lab@exemplo.org).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Payload = {
  id?: string;
  recipient_id?: string;
  type?: string;
  params?: Record<string, unknown>;
  link?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// Comparação em tempo constante, para o segredo não vazar por diferença de tempo de resposta.
function sameSecret(received: string, expected: string) {
  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!supabaseUrl || !serviceRoleKey || !secret || !publicKey || !privateKey || !subject) {
    return json({ error: "function_not_configured" }, 500);
  }

  const received = request.headers.get("x-push-secret") ?? "";
  if (!sameSecret(received, secret)) return json({ error: "unauthorized" }, 401);

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!payload.recipient_id || !payload.type) return json({ error: "invalid_payload" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", payload.recipient_id);
  if (error) return json({ error: "subscriptions_load_failed" }, 500);
  if (!subscriptions?.length) return json({ sent: 0, removed: 0 });

  webpush.setVapidDetails(subject, publicKey, privateKey);
  // Só o tipo e os dados do evento: o texto é montado no service worker, na língua do navegador.
  const message = JSON.stringify({ id: payload.id, type: payload.type, params: payload.params ?? {}, link: payload.link ?? "/" });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          message,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
      } catch (reason) {
        const status = (reason as { statusCode?: number }).statusCode;
        // 404/410: o navegador cancelou a assinatura; não adianta tentar de novo.
        if (status === 404 || status === 410) gone.push(subscription.id);
      }
    }),
  );

  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  return json({ sent, removed: gone.length });
});
