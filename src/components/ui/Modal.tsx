import { ReactNode, useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useT } from "../../i18n";
import { Button } from "./Button";

type ModalProps = {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** No celular, abre como bottom-sheet colado na base da tela. */
  sheet?: boolean;
  /** Botões ao lado do fechar; com eles o cabeçalho fica fixo no topo ao rolar. */
  headerActions?: ReactNode;
  /** Há algo não salvo que o formulário não revela (fotos anexadas, por exemplo). */
  unsaved?: boolean;
  /** Por padrão, qualquer campo mexido conta como não salvo; desligue quando só `unsaved` deve valer. */
  trackInputs?: boolean;
  /** Quando informado, a pergunta sobre alterações não salvas também oferece salvar. */
  onSave?: () => void;
};

// Modais abertos, do mais antigo ao mais novo: o Esc vale só para o de cima.
const openModals: symbol[] = [];

// Fechar pelo X, pelo Esc ou clicando fora pergunta antes quando há algo não salvo. Os botões "Cancelar" de cada
// formulário chamam `onClose` direto, porque cancelar já é desistir.
export function Modal({ children, description, headerActions, onClose, onSave, sheet = false, title, trackInputs = true, unsaved = false, wide = false }: ModalProps) {
  const t = useT();
  const [touched, setTouched] = useState(false);
  const [asking, setAsking] = useState(false);
  const pressedOutside = useRef(false);
  const pending = unsaved || (trackInputs && touched);

  function requestClose() {
    if (pending) setAsking(true);
    else onClose();
  }

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    const id = Symbol();
    openModals.push(id);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && openModals[openModals.length - 1] === id) requestCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      openModals.splice(openModals.indexOf(id), 1);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (typeof document === "undefined") return null;

  // Só fecha quando o clique começa e termina fora: arrastar uma seleção de texto para fora não conta. Eventos de um
  // modal aberto por cima chegam aqui pela árvore do React, mas com outro alvo.
  const isOutside = (event: MouseEvent) => event.target === event.currentTarget;

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[100] flex justify-center bg-black/50 p-4 backdrop-blur-sm",
        sheet ? "items-end sm:items-center" : "items-center",
      ].join(" ")}
      onMouseDown={(event) => {
        pressedOutside.current = isOutside(event);
      }}
      onClick={(event) => {
        if (pressedOutside.current && isOutside(event)) requestClose();
        pressedOutside.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onInput={() => setTouched(true)}
        onChange={() => setTouched(true)}
        className={[
          "max-h-[92vh] overflow-y-auto rounded-lg border border-border bg-surface px-5 pb-5 text-left shadow-2xl sm:px-9 sm:pb-8",
          headerActions ? "" : "pt-5 sm:pt-8",
          wide ? "w-[min(94vw,960px)]" : "w-[min(94vw,720px)]",
        ].join(" ")}
      >
        <div
          className={[
            "mb-5 flex items-start justify-between gap-4",
            headerActions ? "sticky top-0 z-20 -mx-5 border-b border-border bg-surface px-5 pb-3 pt-5 sm:-mx-9 sm:px-9 sm:pt-6" : "",
          ].join(" ")}
        >
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-tight text-text sm:text-2xl">{title}</h3>
            {description ? <p className="mt-1.5 text-base leading-6 text-muted">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <button
              type="button"
              title={t("common.close")}
              aria-label={t("common.close")}
              onClick={requestClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-text"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        {children}
      </div>
      {asking ? (
        <Modal title={t("modal.unsavedTitle")} trackInputs={false} onClose={() => setAsking(false)}>
          <div className="grid gap-5">
            <p className="text-base text-text">{t("modal.unsavedText")}</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button autoFocus variant="secondary" onClick={() => setAsking(false)}>
                {t("modal.keepEditing")}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setAsking(false);
                  onClose();
                }}
              >
                {t("modal.discard")}
              </Button>
              {onSave ? (
                <Button
                  onClick={() => {
                    setAsking(false);
                    onSave();
                  }}
                >
                  {t("common.save")}
                </Button>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>,
    document.body,
  );
}
