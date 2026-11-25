import { useRef, useState } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

import { useT } from "../../i18n";
import { applyRichFormat, type RichFormat } from "../../lib/richText";
import { inputClassName } from "./formStyles";
import { RichText } from "./RichText";

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const toolButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-text transition hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

// Campo de texto com barra de formatação (negrito, itálico, listas) e aba para ver o resultado, como no Trello.
export function RichTextEditor({ label, onChange, value }: RichTextEditorProps) {
  const t = useT();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [vendo, setVendo] = useState(false);

  function formatar(format: RichFormat) {
    const area = areaRef.current;
    if (!area) return;
    const resultado = applyRichFormat(value, area.selectionStart, area.selectionEnd, format);
    onChange(resultado.value);
    // A seleção só pode ser refeita depois que o React escrever o novo texto.
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(resultado.start, resultado.end);
    });
  }

  function atalho(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      formatar(key === "b" ? "bold" : "italic");
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-base font-semibold text-text">{label}</span>
        <div className="flex items-center gap-1">
          {vendo ? null : (
            <>
              <button type="button" className={toolButton} aria-label={t("richText.bold")} title={t("richText.bold")} onClick={() => formatar("bold")}>
                <Bold className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={toolButton} aria-label={t("richText.italic")} title={t("richText.italic")} onClick={() => formatar("italic")}>
                <Italic className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={toolButton} aria-label={t("richText.bullets")} title={t("richText.bullets")} onClick={() => formatar("bullet")}>
                <List className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={toolButton} aria-label={t("richText.numbered")} title={t("richText.numbered")} onClick={() => formatar("numbered")}>
                <ListOrdered className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            aria-pressed={vendo}
            className="ml-1 min-h-9 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-text hover:border-primary"
            onClick={() => setVendo((atual) => !atual)}
          >
            {vendo ? t("richText.edit") : t("richText.preview")}
          </button>
        </div>
      </div>
      {vendo ? (
        <div className="min-h-24 rounded-lg border border-border bg-background p-3">
          {value.trim() ? <RichText text={value} /> : <p className="text-base text-muted">{t("richText.empty")}</p>}
        </div>
      ) : (
        <textarea
          ref={areaRef}
          aria-label={label}
          className={`${inputClassName} min-h-28 py-3`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={atalho}
        />
      )}
      {vendo ? null : <p className="text-sm text-muted">{t("richText.hint")}</p>}
    </div>
  );
}
