import { supabase } from "./supabaseClient";

const PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Converte a chave pública VAPID (base64url) no formato que o navegador pede.
export function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** O navegador e o ambiente aguentam push (service worker, PushManager e chave pública configurada)? */
export function isPushSupported(): boolean {
  return Boolean(PUBLIC_KEY) && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function serviceWorkerUrl() {
  return `${import.meta.env.BASE_URL}sw.js`;
}

async function getRegistration() {
  const existing = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (!existing) return navigator.serviceWorker.register(serviceWorkerUrl(), { scope: import.meta.env.BASE_URL });
  // Pede ao navegador para buscar o service worker novo a cada abertura do app: é ele que escreve os avisos.
  void existing.update().catch(() => undefined);
  return existing;
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!supabase || !json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("push_subscription_incomplete");
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;
}

/** Assina este navegador e guarda a assinatura da pessoa logada. Devolve false se não deu (sem suporte, sem chave, erro). */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  try {
    const registration = await getRegistration();
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY as string) as BufferSource,
      }));
    await saveSubscription(subscription);
    return true;
  } catch {
    return false;
  }
}

/** Cancela a assinatura deste navegador e apaga o registro (ao desligar os avisos ou sair). */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // sem assinatura para cancelar: nada a fazer
  }
}
