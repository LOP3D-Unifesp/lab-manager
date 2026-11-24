import { subscribeToPush, unsubscribeFromPush } from "./push";

const STORAGE_KEY = "avisos-no-computador";
// Com o push ativo o service worker mostra os avisos (inclusive com a aba aberta em segundo plano); a página não repete.
const PUSH_KEY = "avisos-push";

export type DesktopAlertState = "unsupported" | "blocked" | "off" | "on";

function readFlag() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// "on" só quando o navegador permitiu e a pessoa não desligou; "off" quando ainda dá para ativar.
export function getDesktopAlertState(): DesktopAlertState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "granted" && readFlag() !== "off") return "on";
  return "off";
}

function setPushFlag(active: boolean) {
  try {
    window.localStorage.setItem(PUSH_KEY, active ? "on" : "off");
  } catch {
    // sem armazenamento local: vale só até recarregar a página
  }
}

function isPushActive() {
  try {
    return window.localStorage.getItem(PUSH_KEY) === "on";
  } catch {
    return false;
  }
}

/** Assina (ou reassina para a pessoa logada) o push deste navegador, se os avisos estiverem ligados. */
export async function syncPushSubscription() {
  if (getDesktopAlertState() !== "on") return;
  setPushFlag(await subscribeToPush());
}

export async function enableDesktopAlerts(): Promise<DesktopAlertState> {
  if (!("Notification" in window)) return "unsupported";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission === "granted") {
    try {
      window.localStorage.setItem(STORAGE_KEY, "on");
    } catch {
      // sem armazenamento local: vale só até recarregar a página
    }
    setPushFlag(await subscribeToPush());
  }
  return getDesktopAlertState();
}

export function disableDesktopAlerts() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // sem armazenamento local: nada a fazer
  }
  setPushFlag(false);
  void unsubscribeFromPush();
}

/** Ao sair, apaga a assinatura deste navegador para os avisos da conta anterior não continuarem chegando. */
export async function releasePushSubscription() {
  setPushFlag(false);
  await unsubscribeFromPush();
}

// Só vale a pena avisar fora do app: com a aba em foco o selo e o sino já mostram.
export function shouldShowDesktopAlert() {
  return getDesktopAlertState() === "on" && !isPushActive() && (document.hidden || !document.hasFocus());
}

export function showDesktopAlert(params: { title: string; body: string; path: string; tag: string }) {
  if (!shouldShowDesktopAlert()) return;
  try {
    const notification = new Notification(params.title, { body: params.body, tag: params.tag });
    notification.onclick = () => {
      window.focus();
      window.location.assign(`${import.meta.env.BASE_URL.replace(/\/$/, "")}${params.path}`);
      notification.close();
    };
  } catch {
    // alguns navegadores só permitem Notification via service worker; o selo e o sino continuam funcionando
  }
}
