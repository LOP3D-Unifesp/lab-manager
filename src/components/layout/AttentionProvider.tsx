import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../lib/auth";
import { describeNewRequest, showDesktopAlert } from "../../lib/desktopAlerts";
import { canMaintain } from "../../lib/domain";
import type { MaintenanceUrgency } from "../../lib/maintenanceRequests";
import { countNewFeedback, countOpenMaintenanceRequests, countRequestedPurchases, getEquipmentName } from "../../lib/supabaseRepository";
import { supabase } from "../../lib/supabaseClient";
import { FEEDBACK_CHANGED_EVENT } from "../feedback/FeedbackProvider";

export const MAINTENANCE_REQUESTS_CHANGED_EVENT = "maintenance-requests-changed";
export const PURCHASES_CHANGED_EVENT = "purchases-changed";

// Plano B quando o canal em tempo real cai.
const POLL_MS = 60_000;

type Attention = {
  /** Chamados de manutenção abertos (só para coordenadores e responsáveis pela manutenção). */
  maintenanceRequests: number;
  /** Quantos dos chamados abertos são urgentes. */
  urgentRequests: number;
  /** Mensagens de feedback ainda não vistas (só para coordenadores). */
  feedback: number;
  /** Pedidos de compra aguardando decisão (só para coordenadores). */
  purchases: number;
  total: number;
};

const emptyAttention: Attention = { maintenanceRequests: 0, urgentRequests: 0, feedback: 0, purchases: 0, total: 0 };

const AttentionContext = createContext<Attention>(emptyAttention);

type NewRequestRow = { equipment_id: string; description: string; urgency: MaintenanceUrgency; requested_by: string | null };

// Reúne o que pede atenção da pessoa logada, para o menu lateral, a campainha e os avisos no computador.
export function AttentionProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const wantsRequests = canMaintain(profile);
  const wantsFeedback = profile?.role === "coordinator";
  const wantsPurchases = profile?.role === "coordinator";
  const [counts, setCounts] = useState({ maintenanceRequests: 0, urgentRequests: 0, feedback: 0, purchases: 0 });
  const realtimeOk = useRef(false);
  const lastRequests = useRef<number | null>(null);

  useEffect(() => {
    lastRequests.current = null;
    if (!profileId || (!wantsRequests && !wantsFeedback && !wantsPurchases)) {
      setCounts({ maintenanceRequests: 0, urgentRequests: 0, feedback: 0, purchases: 0 });
      return undefined;
    }

    let ativo = true;
    const atualizar = () => {
      Promise.all([
        wantsRequests ? countOpenMaintenanceRequests() : Promise.resolve({ open: 0, urgent: 0 }),
        wantsFeedback ? countNewFeedback() : Promise.resolve(0),
        wantsPurchases ? countRequestedPurchases() : Promise.resolve(0),
      ])
        .then(([requests, feedback, purchases]) => {
          if (!ativo) return;
          // Sem tempo real, um aumento na contagem ainda gera um aviso (genérico) no computador.
          if (!realtimeOk.current && lastRequests.current !== null && requests.open > lastRequests.current) {
            showDesktopAlert({
              title: "Novo chamado de manutenção",
              body: "Abra a lista de chamados para ver os detalhes.",
              path: "/equipamentos?vista=chamados",
              tag: "chamados-novos",
            });
          }
          lastRequests.current = requests.open;
          setCounts({ maintenanceRequests: requests.open, urgentRequests: requests.urgent, feedback, purchases });
        })
        .catch(() => undefined);
    };

    async function avisarChamado(row: NewRequestRow) {
      if (row.requested_by === profileId) return;
      const equipmentName = await getEquipmentName(row.equipment_id).catch(() => null);
      showDesktopAlert({
        ...describeNewRequest(row, equipmentName),
        path: "/equipamentos?vista=chamados",
        tag: "chamado-novo",
      });
    }

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
        channel.on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, (payload) => {
          atualizar();
          if (payload.eventType === "INSERT") void avisarChamado(payload.new as NewRequestRow);
        });
      }
      if (wantsFeedback) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "feedback_reports" }, (payload) => {
          atualizar();
          if ((payload.new as { created_by?: string | null }).created_by !== profileId) {
            showDesktopAlert({
              title: "Novo feedback",
              body: "Alguém enviou uma sugestão ou erro.",
              path: "/feedback",
              tag: "feedback-novo",
            });
          }
        });
      }
      if (wantsPurchases) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, (payload) => {
          atualizar();
          if (payload.eventType === "INSERT" && (payload.new as { requested_by?: string | null }).requested_by !== profileId) {
            const row = payload.new as { item?: string };
            showDesktopAlert({
              title: "Novo pedido de compra",
              body: row.item ?? "Há um pedido aguardando aprovação.",
              path: "/compras",
              tag: "compra-nova",
            });
          }
        });
      }
      channel.subscribe((status) => {
        realtimeOk.current = status === "SUBSCRIBED";
      });
    }

    return () => {
      ativo = false;
      realtimeOk.current = false;
      window.clearInterval(timer);
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
      window.removeEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, atualizar);
      window.removeEventListener(PURCHASES_CHANGED_EVENT, atualizar);
      document.removeEventListener("visibilitychange", atualizar);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [profileId, wantsRequests, wantsFeedback, wantsPurchases]);

  const value = useMemo(() => ({ ...counts, total: counts.maintenanceRequests + counts.feedback + counts.purchases }), [counts]);

  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

export function useAttention() {
  return useContext(AttentionContext);
}
