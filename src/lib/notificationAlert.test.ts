import { describe, expect, it } from "vitest";

import source from "../../public/sw.js?raw";
import { describeAlertBody } from "./notificationAlert";
import type { NotificationType } from "./notifications";

// O push é escrito pelo service worker, que não importa o código do app: os dois precisam dizer a mesma coisa.
const worker = new Function("self", `${source}\nreturn describe;`)({ addEventListener: () => undefined, navigator: { language: "pt-BR" } }) as (data: {
  type: string;
  params: Record<string, unknown>;
}) => { title: string; body: string };

const samples: Array<{ type: NotificationType; params: Record<string, unknown>; body: string }> = [
  {
    type: "task_assigned",
    params: { task: "Reenviar o CEP", project: "Mio3D", by: "Ana", due_on: "2026-11-28", priority: "urgent", description: "Mandar para o comitê." },
    body: "Reenviar o CEP\nMio3D · Prazo 28/11 · Urgente\nMandar para o comitê.",
  },
  {
    type: "task_status",
    params: { task: "Calibrar", project: "Lab 3D", by: "Ana", status: "review", priority: "normal" },
    body: "Calibrar\nLab 3D · por Ana",
  },
  { type: "task_timer_reminder", params: { task: "Ensaio", project: "Lab 3D", hours: 4 }, body: "Ensaio\nLab 3D" },
  {
    type: "request_new",
    params: { equipment: "Bambu", author: "Pedro", by: "Pedro", description: "Bico entupido" },
    body: "Bambu\nAberto por Pedro\nBico entupido",
  },
  {
    type: "request_status",
    params: { equipment: "Bambu", status: "resolved", by: "Marina", description: "Bico entupido", solution: "Bico trocado" },
    body: "Bambu\npor Marina\nSolução: Bico trocado",
  },
  {
    type: "purchase_new",
    params: { item: "Bico 0,4", quantity: 2, amount: 120, author: "Pedro", stock: true, description: "Reserva" },
    body: "Bico 0,4 × 2\nR$\u00a0120,00 · por Pedro · Estoque geral\nReserva",
  },
  {
    type: "purchase_status",
    params: { item: "Filamento", quantity: 1, amount: 90.5, by: "Carla", project: "Mio3D", status: "rejected", reason: "Sem verba" },
    body: "Filamento\nR$\u00a090,50 · por Carla · Mio3D\nMotivo: Sem verba",
  },
  {
    type: "booking_pending",
    params: { equipment: "Bambu", project: "TCC", author: "Pedro", starts_at: "2026-11-28T17:00:00+00:00", ends_at: "2026-11-28T19:30:00+00:00", timezone: "America/Sao_Paulo" },
    body: "Bambu\n28/11 14:00–16:30 · TCC · Pedro",
  },
  {
    type: "booking_rejected",
    params: { equipment: "Bambu", project: "TCC", author: "Pedro", reason: "Manutenção", starts_at: "2026-11-28T23:00:00+00:00", ends_at: "2026-11-29T13:00:00+00:00", timezone: "America/Sao_Paulo" },
    body: "Bambu\n28/11 20:00–29/11 10:00 · TCC\nMotivo: Manutenção",
  },
  { type: "project_join_request", params: { requester: "Pedro", project: "Mio3D", description: "Quero ajudar" }, body: "Pedro · Mio3D\nQuero ajudar" },
  { type: "project_join_decision", params: { project: "Mio3D", by: "Ana", approved: true }, body: "Mio3D\npor Ana" },
  { type: "feedback_new", params: { author: "Pedro", kind: "suggestion", description: "Um botão a mais" }, body: "Pedro\nUm botão a mais" },
];

describe("texto do aviso no computador e do push", () => {
  it.each(samples)("$type traz os detalhes, iguais no app e no push", ({ body, params, type }) => {
    expect(describeAlertBody({ type, params })).toBe(body);
    expect(worker({ type, params }).body).toBe(body);
  });

  it("avisos antigos, sem os detalhes, continuam mostrando o assunto", () => {
    expect(describeAlertBody({ type: "task_assigned", params: { task: "Calibrar", project: "Lab 3D" } })).toBe("Calibrar\nLab 3D");
    expect(worker({ type: "purchase_new", params: { item: "Bico" } }).body).toBe("Bico");
    expect(worker({ type: "tipo_novo", params: {} })).toEqual({ title: "Nova notificação", body: "" });
  });

  it("o push diz quem atribuiu a tarefa", () => {
    expect(worker({ type: "task_assigned", params: { by: "Ana" } }).title).toBe("Ana atribuiu uma tarefa a você");
  });
});
