import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

import { useT } from "../../i18n";
import { parseRichText, serializeRichText, type InlineNode } from "../../lib/richText";
import { inputClassName } from "./formStyles";

type RichTextEditorProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const toolButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-md text-text transition hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function inlineToDom(nodes: InlineNode[], parent: Node) {
  for (const node of nodes) {
    if (node.type === "text") {
      parent.appendChild(document.createTextNode(node.text));
    } else if (node.type === "code") {
      const code = document.createElement("code");
      code.textContent = node.text;
      parent.appendChild(code);
    } else if (node.type === "link") {
      const link = document.createElement("a");
      link.href = node.href;
      link.textContent = node.text;
      parent.appendChild(link);
    } else {
      const element = document.createElement(node.type === "bold" ? "strong" : "em");
      inlineToDom(node.children, element);
      parent.appendChild(element);
    }
  }
}

// Desenha o texto com marcas dentro do editor (só com nós do DOM, nunca HTML em texto).
function fillEditor(root: HTMLElement, text: string) {
  root.replaceChildren();
  parseRichText(text).forEach((block, index) => {
    if (index > 0 && block.type === "paragraph") {
      // Parágrafos separados por uma linha em branco.
      const blank = document.createElement("div");
      blank.appendChild(document.createElement("br"));
      root.appendChild(blank);
    }
    if (block.type === "list") {
      const list = document.createElement(block.ordered ? "ol" : "ul");
      for (const item of block.items) {
        const li = document.createElement("li");
        inlineToDom(item, li);
        list.appendChild(li);
      }
      root.appendChild(list);
    } else {
      for (const line of block.lines) {
        const div = document.createElement("div");
        inlineToDom(line, div);
        root.appendChild(div);
      }
    }
  });
}

// Campo de texto formatado: a pessoa escreve e já vê negrito, itálico e listas (sem aba de visualização), como no
// Trello. O texto é guardado com marcas simples (**negrito**, - lista) e o conteúdo colado entra sempre como texto puro.
export function RichTextEditor({ label, onChange, value }: RichTextEditorProps) {
  const t = useT();
  const areaRef = useRef<HTMLDivElement>(null);

  // O conteúdo inicial entra uma vez; depois o navegador é quem mantém o que a pessoa digita.
  useEffect(() => {
    if (areaRef.current) fillEditor(areaRef.current, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sincronizar() {
    if (areaRef.current) onChange(serializeRichText(areaRef.current));
  }

  function comando(nome: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList") {
    areaRef.current?.focus();
    document.execCommand(nome);
    sincronizar();
  }

  const botao = (nome: Parameters<typeof comando>[0], titulo: string, Icone: typeof Bold) => (
    <button
      type="button"
      className={toolButton}
      aria-label={titulo}
      title={titulo}
      // Não tira a seleção do texto ao clicar na barra.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => comando(nome)}
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id="rich-editor-label" className="text-base font-semibold text-text">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {botao("bold", t("richText.bold"), Bold)}
          {botao("italic", t("richText.italic"), Italic)}
          {botao("insertUnorderedList", t("richText.bullets"), List)}
          {botao("insertOrderedList", t("richText.numbered"), ListOrdered)}
        </div>
      </div>
      <div
        ref={areaRef}
        role="textbox"
        aria-multiline="true"
        aria-labelledby="rich-editor-label"
        contentEditable
        suppressContentEditableWarning
        className={`${inputClassName} block min-h-28 whitespace-pre-wrap break-words py-3 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6`}
        onInput={sincronizar}
        onBlur={sincronizar}
        onPaste={(event) => {
          // Cola só o texto, sem trazer a formatação de outros sites.
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
      />
      <p className="text-sm text-muted">{t("richText.hint")}</p>
    </div>
  );
}
