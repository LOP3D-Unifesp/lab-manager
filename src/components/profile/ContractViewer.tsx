import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { t } from "../../i18n";
import { getGrantContractUrl } from "../../lib/supabaseRepository";
import { Modal } from "../ui/Modal";

type ContractViewerProps = {
  /** Caminho do PDF no armazenamento privado. */
  path: string;
  onClose: () => void;
};

// Mostra o termo de outorga numa janela por cima da página, sem abrir outra aba. Alguns navegadores de celular não
// exibem PDF dentro da página; o link "Abrir em outra aba" cobre esse caso.
export function ContractViewer({ onClose, path }: ContractViewerProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getGrantContractUrl(path)
      .then((signed) => {
        if (active) setUrl(signed);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return (
    <Modal onClose={onClose} title={t("grants.contract")} wide>
      {error ? (
        <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{t("grants.errContract")}</p>
      ) : !url ? (
        <p className="text-base text-muted">{t("common.loading")}</p>
      ) : (
        <div className="grid gap-3">
          <iframe className="h-[70vh] w-full rounded-lg border border-border bg-background" src={url} title={t("grants.contract")} />
          <a
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
            href={url}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t("grants.contractOpenTab")}
          </a>
        </div>
      )}
    </Modal>
  );
}
