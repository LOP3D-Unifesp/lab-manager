import type { ReactNode } from "react";

import { useT } from "../../i18n";
import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Pergunta "tem certeza?" antes de uma ação que não dá para desfazer (no lugar do window.confirm do navegador).
export function ConfirmDialog({ busy = false, children, confirmLabel, onCancel, onConfirm, title }: ConfirmDialogProps) {
  const t = useT();
  return (
    <Modal onClose={onCancel} title={title}>
      <div className="grid gap-5">
        <div className="text-base text-text">{children}</div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={busy} onClick={onCancel} variant="secondary">
            {t("common.cancel")}
          </Button>
          <Button disabled={busy} onClick={onConfirm} variant="danger">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
