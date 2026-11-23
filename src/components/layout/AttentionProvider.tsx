import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../lib/auth";
import { canMaintain } from "../../lib/domain";
import { countNewFeedback, countOpenMaintenanceRequests } from "../../lib/supabaseRepository";
import { FEEDBACK_CHANGED_EVENT } from "../feedback/FeedbackProvider";

export const MAINTENANCE_REQUESTS_CHANGED_EVENT = "maintenance-requests-changed";

const POLL_MS = 60_000;

type Attention = {
  /** Chamados de manutenção abertos (só para coordenadores e responsáveis pela manutenção). */
  maintenanceRequests: number;
  /** Mensagens de feedback ainda não vistas (só para coordenadores). */
  feedback: number;
  total: number;
};

const emptyAttention: Attention = { maintenanceRequests: 0, feedback: 0, total: 0 };

const AttentionContext = createContext<Attention>(emptyAttention);

// Reúne o que pede atenção da pessoa logada, para o menu lateral e para a campainha.
export function AttentionProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const wantsRequests = canMaintain(profile);
  const wantsFeedback = profile?.role === "coordinator";
  const [counts, setCounts] = useState({ maintenanceRequests: 0, feedback: 0 });

  useEffect(() => {
    if (!wantsRequests && !wantsFeedback) {
      setCounts({ maintenanceRequests: 0, feedback: 0 });
      return undefined;
    }

    let ativo = true;
    const atualizar = () => {
      Promise.all([
        wantsRequests ? countOpenMaintenanceRequests() : Promise.resolve(0),
        wantsFeedback ? countNewFeedback() : Promise.resolve(0),
      ])
        .then(([maintenanceRequests, feedback]) => ativo && setCounts({ maintenanceRequests, feedback }))
        .catch(() => undefined);
    };

    atualizar();
    const timer = window.setInterval(atualizar, POLL_MS);
    window.addEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
    window.addEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, atualizar);
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      ativo = false;
      window.clearInterval(timer);
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
      window.removeEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [wantsRequests, wantsFeedback]);

  const value = useMemo(
    () => ({ ...counts, total: counts.maintenanceRequests + counts.feedback }),
    [counts],
  );

  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

export function useAttention() {
  return useContext(AttentionContext);
}
