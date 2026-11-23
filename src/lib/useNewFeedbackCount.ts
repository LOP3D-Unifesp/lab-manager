import { useEffect, useState } from "react";

import { FEEDBACK_CHANGED_EVENT } from "../components/feedback/FeedbackProvider";
import { countNewFeedback } from "./supabaseRepository";

const POLL_MS = 60_000;

// Quantas mensagens de feedback ainda não foram vistas. Só o coordenador consulta (a RLS devolve zero aos outros).
export function useNewFeedbackCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return undefined;
    }

    let ativo = true;
    const atualizar = () => {
      countNewFeedback()
        .then((value) => ativo && setCount(value))
        .catch(() => undefined);
    };

    atualizar();
    const timer = window.setInterval(atualizar, POLL_MS);
    window.addEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
    document.addEventListener("visibilitychange", atualizar);

    return () => {
      ativo = false;
      window.clearInterval(timer);
      window.removeEventListener(FEEDBACK_CHANGED_EVENT, atualizar);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [enabled]);

  return count;
}
