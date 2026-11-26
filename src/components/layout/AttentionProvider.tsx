import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import { useAuth } from "../../lib/auth";
import { canMaintain } from "../../lib/domain";
import { countDueTasks, toLocalDate } from "../../lib/projects";
import { countNewFeedback, countOpenMaintenanceRequests, countPendingBookings, countRequestedPurchases, listMyDueTasks } from "../../lib/supabaseRepository";
import { supabase } from "../../lib/supabaseClient";
import { FEEDBACK_CHANGED_EVENT } from "../feedback/FeedbackProvider";

export const MAINTENANCE_REQUESTS_CHANGED_EVENT = "maintenance-requests-changed";
export const PURCHASES_CHANGED_EVENT = "purchases-changed";

// Plano B quando o canal em tempo real cai.
const POLL_MS = 60_000;
// Mover um cartão renumera a coluna: os vários eventos viram uma só consulta.
const TASKS_DEBOUNCE_MS = 750;

type Attention = {
  /** Chamados de manutenção abertos (só para coordenadores e responsáveis pela manutenção). */
  maintenanceRequests: number;
  /** Quantos dos chamados abertos são urgentes. */
  urgentRequests: number;
  /** Mensagens de feedback ainda não vistas (só para coordenadores). */
  feedback: number;
  /** Pedidos de compra aguardando decisão (só coordenador). */
  purchases: number;
  /** Quantos dos pedidos aguardando decisão são urgentes (só coordenador). */
  urgentPurchases: number;
  /** Reservas aguardando aprovação (só coordenador). */
  pendingBookings: number;
  /** Tarefas da pessoa atrasadas ou que vencem hoje. */
  dueTasks: number;
  /** Quantas delas já estão atrasadas. */
  overdueTasks: number;
};

const emptyCounts: Attention = {
  maintenanceRequests: 0,
  urgentRequests: 0,
  feedback: 0,
  purchases: 0,
  urgentPurchases: 0,
  pendingBookings: 0,
  dueTasks: 0,
  overdueTasks: 0,
};

const AttentionContext = createContext<Attention>(emptyCounts);

// Reúne o trabalho em aberto da pessoa logada (contado direto das tabelas), para o menu lateral e a campainha.
// Os avisos de eventos novos (painel e computador) vêm das notificações, em NotificationsProvider.
export function AttentionProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const wantsRequests = canMaintain(profile);
  const wantsFeedback = profile?.role === "coordinator";
  const wantsPurchases = profile?.role === "coordinator";
  const [counts, setCounts] = useState(emptyCounts);

  useEffect(() => {
    if (!profileId) {
      setCounts(emptyCounts);
      return undefined;
    }

    let ativo = true;
    let atraso: number | undefined;
    const atualizar = () => {
      const hoje = toLocalDate(new Date());
      Promise.all([
        wantsRequests ? countOpenMaintenanceRequests() : Promise.resolve({ open: 0, urgent: 0 }),
        wantsFeedback ? countNewFeedback() : Promise.resolve(0),
        wantsPurchases ? countRequestedPurchases() : Promise.resolve({ open: 0, urgent: 0 }),
        wantsPurchases ? countPendingBookings() : Promise.resolve(0),
        listMyDueTasks(profileId, hoje),
      ])
        .then(([requests, feedback, purchases, pendingBookings, myTasks]) => {
          if (!ativo) return;
          const tasks = countDueTasks(myTasks, hoje);
          setCounts({
            maintenanceRequests: requests.open,
            urgentRequests: requests.urgent,
            feedback,
            purchases: purchases.open,
            urgentPurchases: purchases.urgent,
            pendingBookings,
            dueTasks: tasks.due,
            overdueTasks: tasks.overdue,
          });
        })
        .catch(() => undefined);
    };

    atualizar();
    const timer = window.setInterval(atualizar, POLL_MS);
    window.addEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
    window.addEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, atualizar);
    window.addEventListener(PURCHASES_CHANGED_EVENT, atualizar);
    document.addEventListener("visibilitychange", atualizar);

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    if (supabase) {
      const client = supabase;
      channel = client.channel(`attention_${profileId}`);
      if (wantsRequests) {
        // O evento atualiza estas contagens e as listas abertas na tela (como os chamados da Inicial).
        channel.on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, () =>
          window.dispatchEvent(new Event(MAINTENANCE_REQUESTS_CHANGED_EVENT)),
        );
      }
      if (wantsFeedback) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "feedback_reports" }, atualizar);
      }
      if (wantsPurchases) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, atualizar);
        channel.on("postgres_changes", { event: "*", schema: "public", table: "equipment_bookings" }, atualizar);
      }
      const agendar = () => {
        window.clearTimeout(atraso);
        atraso = window.setTimeout(atualizar, TASKS_DEBOUNCE_MS);
      };
      channel.on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" }, agendar);
      channel.on("postgres_changes", { event: "*", schema: "public", table: "project_task_assignees" }, agendar);
      channel.subscribe();
    }

    return () => {
      ativo = false;
      window.clearTimeout(atraso);
      window.clearInterval(timer);
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
      window.removeEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, atualizar);
      window.removeEventListener(PURCHASES_CHANGED_EVENT, atualizar);
      document.removeEventListener("visibilitychange", atualizar);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [profileId, wantsRequests, wantsFeedback, wantsPurchases]);

  return <AttentionContext.Provider value={counts}>{children}</AttentionContext.Provider>;
}

export function useAttention() {
  return useContext(AttentionContext);
}
