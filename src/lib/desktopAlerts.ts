import type { MaintenanceUrgency } from "./maintenanceRequests";

const STORAGE_KEY = "avisos-no-computador";

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

export async function enableDesktopAlerts(): Promise<DesktopAlertState> {
  if (!("Notification" in window)) return "unsupported";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission === "granted") {
    try {
      window.localStorage.setItem(STORAGE_KEY, "on");
    } catch {
      // sem armazenamento local: vale só até recarregar a página
    }
  }
  return getDesktopAlertState();
}

export function disableDesktopAlerts() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // sem armazenamento local: nada a fazer
  }
}

// Só vale a pena avisar fora do app: com a aba em foco o selo e o sino já mostram.
export function shouldShowDesktopAlert() {
  return getDesktopAlertState() === "on" && (document.hidden || !document.hasFocus());
}

export function describeNewRequest(request: { urgency: MaintenanceUrgency; description: string }, equipmentName: string | null) {
  const where = equipmentName ?? "um equipamento";
  const text = request.description.trim();
  return {
    title: request.urgency === "urgent" ? `Chamado urgente: ${where}` : `Novo chamado: ${where}`,
    body: text.length > 140 ? `${text.slice(0, 137)}...` : text,
  };
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
