import { getLocale, t } from "../../i18n";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../lib/auth";
import { describeNewRequest, showDesktopAlert } from "../../lib/desktopAlerts";
import { describePurchaseUpdate, isNotifiablePurchaseStatus } from "../../lib/purchases";
import { canMaintain } from "../../lib/domain";
import type { MaintenanceUrgency } from "../../lib/maintenanceRequests";
import { countNewFeedback, countOpenMaintenanceRequests, countPendingBookings, countRequestedPurchases, getEquipmentName } from "../../lib/supabaseRepository";
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

const emptyAttention: Attention = {
  maintenanceRequests: 0,
  urgentRequests: 0,
  feedback: 0,
  purchases: 0,
  urgentPurchases: 0,
  pendingBookings: 0,
  total: 0,
};

const AttentionContext = createContext<Attention>(emptyAttention);

type NewRequestRow = { equipment_id: string; description: string; urgency: MaintenanceUrgency; requested_by: string | null };

// Reúne o que pede atenção da pessoa logada, para o menu lateral, a campainha e os avisos no computador.
export function AttentionProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const profileId = profile?.id ?? null;
  const wantsRequests = canMaintain(profile);
  const wantsFeedback = profile?.role === "coordinator";
  const wantsPurchases = profile?.role === "coordinator";
  // Quem não é coordenador acompanha as decisões sobre os próprios pedidos.
  const wantsMyPurchases = Boolean(profileId) && profile?.role !== "coordinator";
  const [counts, setCounts] = useState({ maintenanceRequests: 0, urgentRequests: 0, feedback: 0, purchases: 0, urgentPurchases: 0, pendingBookings: 0 });
  const realtimeOk = useRef(false);
  const lastRequests = useRef<number | null>(null);

  useEffect(() => {
    lastRequests.current = null;
    if (!profileId || (!wantsRequests && !wantsFeedback && !wantsPurchases && !wantsMyPurchases)) {
      setCounts({ maintenanceRequests: 0, urgentRequests: 0, feedback: 0, purchases: 0, urgentPurchases: 0, pendingBookings: 0 });
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
          // Sem tempo real, um aumento na contagem ainda gera um aviso (genérico) no computador.
          if (!realtimeOk.current && lastRequests.current !== null && requests.open > lastRequests.current) {
            showDesktopAlert({
              title: t("alert.newRequestTitle"),
              body: t("alert.newRequestBody"),
              path: "/equipamentos?vista=chamados",
              tag: "chamados-novos",
            });
          }
          lastRequests.current = requests.open;
          setCounts({ maintenanceRequests: requests.open, urgentRequests: requests.urgent, feedback, purchases: purchases.open, urgentPurchases: purchases.urgent, pendingBookings });
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
              title: t("alert.newFeedbackTitle"),
              body: t("alert.newFeedbackBody"),
              path: "/feedback",
              tag: "feedback-novo",
            });
          }
        });
      }
      if (wantsPurchases) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "equipment_bookings" }, atualizar);
      }
      if (wantsMyPurchases && profileId) {
        channel.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "purchase_requests", filter: `requested_by=eq.${profileId}` },
          (payload) => {
            atualizar();
            const row = payload.new as { item?: string; status?: string; rejected_reason?: string | null };
            if (row.item && row.status && isNotifiablePurchaseStatus(row.status)) {
              showDesktopAlert({
                ...describePurchaseUpdate({ item: row.item, status: row.status, rejected_reason: row.rejected_reason ?? null }),
                path: "/compras",
                tag: "compra-atualizada",
              });
            }
          },
        );
      }
      if (wantsPurchases) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: "purchase_requests" }, (payload) => {
          atualizar();
          if (payload.eventType === "INSERT" && (payload.new as { requested_by?: string | null }).requested_by !== profileId) {
            const row = payload.new as { item?: string; urgency?: string };
            showDesktopAlert({
              title: row.urgency === "urgent" ? t("alert.urgentPurchase") : t("alert.newPurchase"),
              body: row.item ?? t("alert.purchaseWaiting"),
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
  }, [profileId, wantsRequests, wantsFeedback, wantsPurchases, wantsMyPurchases]);

  const value = useMemo(
    () => ({ ...counts, total: counts.maintenanceRequests + counts.feedback + counts.purchases + counts.pendingBookings }),
    [counts],
  );

  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

export function useAttention() {
  return useContext(AttentionContext);
}
