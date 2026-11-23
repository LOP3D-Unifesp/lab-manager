import { FormEvent, ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle2, MessageSquarePlus } from "lucide-react";

import {
  FEEDBACK_MAX_LENGTH,
  buildFeedbackContext,
  feedbackKindOptions,
  getFeedbackErrorMessage,
  validateFeedbackMessage,
  type FeedbackKind,
} from "../../lib/feedback";
import { createFeedback } from "../../lib/supabaseRepository";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export const FEEDBACK_CHANGED_EVENT = "feedback-changed";

type FeedbackContextValue = { openFeedback: () => void };

const FeedbackContext = createContext<FeedbackContextValue>({ openFeedback: () => undefined });

export function useFeedback() {
  return useContext(FeedbackContext);
}

function FeedbackModal({ onClose, pagePath }: { onClose: () => void; pagePath: string }) {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalido = validateFeedbackMessage(message);
    if (invalido) {
      setErro(invalido);
      return;
    }
    try {
      setEnviando(true);
      setErro("");
      const context = buildFeedbackContext(pagePath, navigator.userAgent);
      await createFeedback({ kind, message, ...context });
      window.dispatchEvent(new Event(FEEDBACK_CHANGED_EVENT));
      setEnviado(true);
    } catch (error) {
      setErro(getFeedbackErrorMessage(error));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Modal title="Mensagem enviada" onClose={onClose}>
        <div className="grid justify-items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-success-dark" aria-hidden="true" />
          <p className="text-lg font-semibold text-text">Obrigado! Recebemos a sua mensagem.</p>
          <p className="text-base text-muted">A coordenação vai ler e, se precisar, falar com você.</p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Enviar feedback"
      description="Encontrou um erro ou tem uma ideia? Conte aqui. Ajuda muito a melhorar o sistema."
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={enviar}>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-base font-semibold text-text">Sobre o quê?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {feedbackKindOptions.map((option) => (
              <label
                key={option.value}
                className={[
                  "grid cursor-pointer gap-0.5 rounded-lg border px-3 py-2 transition",
                  kind === option.value ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-primary",
                ].join(" ")}
              >
                <input
                  checked={kind === option.value}
                  className="sr-only"
                  name="feedback-kind"
                  type="radio"
                  value={option.value}
                  onChange={() => setKind(option.value)}
                />
                <span className="text-base font-bold text-text">{option.label}</span>
                <span className="text-sm text-muted">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-base font-semibold text-text">
          Mensagem
          <textarea
            autoFocus
            className="min-h-32 min-w-0 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
            maxLength={FEEDBACK_MAX_LENGTH}
            placeholder={kind === "bug" ? "O que você tentou fazer e o que aconteceu?" : "Conte a sua ideia ou dúvida."}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <span className="text-sm font-normal text-muted">
            Enviamos junto a página em que você está ({pagePath}) para facilitar. Não escreva senhas.
          </span>
        </label>

        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const openFeedback = useCallback(() => setAberto(true), []);
  const value = useMemo(() => ({ openFeedback }), [openFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FloatingFeedbackButton />
      {aberto ? <FeedbackModal pagePath={`${location.pathname}${location.search}`} onClose={() => setAberto(false)} /> : null}
    </FeedbackContext.Provider>
  );
}

// No desktop fica discreto no canto; no celular a entrada é o menu da conta, para não brigar com a barra de baixo.
function FloatingFeedbackButton() {
  const { openFeedback } = useFeedback();
  return (
    <button
      type="button"
      onClick={openFeedback}
      className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-base font-semibold text-text shadow-soft transition hover:border-primary hover:text-primary lg:inline-flex"
    >
      <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
      Feedback
    </button>
  );
}
