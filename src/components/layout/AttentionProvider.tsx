import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../lib/auth";
import { canMaintain } from "../../lib/domain";
import { countNewFeedback, countOpenMaintenanceRequests, countPendingBookings, countRequestedPurchases } from "../../lib/supabaseRepository";
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
  /** Pedidos de compra aguardando decisão (só coordenador). */
  purchases: number;
  /** Quantos dos pedidos aguardando decisão são urgentes (só coordenador). */
  urgentPurchases: number;
  /** Reservas aguardando aprovação (só coordenador). */
  pendingBookings: number;
  total: number;
};

const emptyCounts = { maintenanceRequests: 0, urgentRequests: 0, feedback: 0, purchases: 0, urgentPurchases: 0, pendingBookings: 0 };

const emptyAttention: Attention = { ...emptyCounts, total: 0 };

const AttentionContext = createContext<Attention>(emptyAttention);

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
    if (!profileId || (!wantsRequests && !wantsFeedback && !wantsPurchases)) {
      setCounts(emptyCounts);
      return undefined;
    }

    let ativo = true;
    const atualizar = () => {
      Promise.all([
        wantsRequests ? countOpenMaintenanceRequests() : Promise.resolve({ open: 0, urgent: 0 }),
        wantsFeedback ? countNewFeedback() : Promise.resolve(0),
        wantsPurchases ? countRequestedPurchases() : Promise.resolve({ open: 0, urgent: 0 }),
        wantsPurchases ? countPendingBookings() : Promise.resolve(0),
      ])
        .then(([requests, feedback, purchases, pendingBookings]) => {
          if (!ativo) return;
          setCounts({
            maintenanceRequests: requests.open,
            urgentRequests: requests.urgent,
            feedback,
            purchases: purchases.open,
            urgentPurchases: purchases.urgent,
            pendingBookings,
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
        channel.on("postgres_changes", { event: "*", schema: "public", table: "maintenance_requests" }, atualizar);
      }
      if (wantsFeedback) {
        channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "feedback_reports" }, atualizar);
      }
      if (wantsPurchases) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, atualizar);
        channel.on("postgres_changes", { event: "*", schema: "public", table: "equipment_bookings" }, atualizar);
      }
      channel.subscribe();
    }

    return () => {
      ativo = false;
      window.clearInterval(timer);
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
      window.removeEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, atualizar);
      window.removeEventListener(PURCHASES_CHANGED_EVENT, atualizar);
      document.removeEventListener("visibilitychange", atualizar);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [profileId, wantsRequests, wantsFeedback, wantsPurchases]);

  const value = useMemo(
    () => ({ ...counts, total: counts.maintenanceRequests + counts.feedback + counts.purchases + counts.pendingBookings }),
    [counts],
  );

  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

export function useAttention() {
  return useContext(AttentionContext);
}
