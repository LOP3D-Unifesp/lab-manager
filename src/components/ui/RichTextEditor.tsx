import { useEffect, useRef } from "react";
import { Bold, Code, Italic, List, ListOrdered } from "lucide-react";

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

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Atalhos de escrita, como no Trello: **texto** vira negrito, *texto* itálico, `texto` código, "- " ou "* " no começo
// da linha vira lista com marcadores e "1. " vira lista numerada. Roda a cada tecla digitada.
function aplicarAtalhos(root: HTMLElement, evento: InputEvent) {
  if (evento.inputType !== "insertText" || !evento.data) return;
  const selecao = window.getSelection();
  const no = selecao?.anchorNode;
  if (!selecao || !selecao.isCollapsed || !no || no.nodeType !== Node.TEXT_NODE || !root.contains(no)) return;
  const posicao = selecao.anchorOffset;
  const antes = (no.textContent ?? "").slice(0, posicao);

  const selecionar = (inicio: number) => {
    const faixa = document.createRange();
    faixa.setStart(no, inicio);
    faixa.setEnd(no, posicao);
    selecao.removeAllRanges();
    selecao.addRange(faixa);
  };

  if (evento.data === " ") {
    const marcador = /^([-*]|\d+\.)[  ]$/.exec(antes);
    const dentroDeLista = Boolean(no.parentElement?.closest("li"));
    if (marcador && !no.previousSibling && !dentroDeLista) {
      selecionar(0);
      document.execCommand("delete");
      document.execCommand(/\d/.test(marcador[1]) ? "insertOrderedList" : "insertUnorderedList");
    }
    return;
  }

  const formatos: Array<{ gatilho: string; regex: RegExp; tag: string }> = [
    { gatilho: "*", regex: /\*\*([^*]+)\*\*$/, tag: "strong" },
    { gatilho: "*", regex: /(?<!\*)\*([^*\s](?:[^*]*[^*\s])?)\*$/, tag: "em" },
    { gatilho: "`", regex: /`([^`]+)`$/, tag: "code" },
  ];
  for (const formato of formatos) {
    if (evento.data !== formato.gatilho) continue;
    const achou = formato.regex.exec(antes);
    if (!achou || !achou[1].trim()) continue;
    selecionar(posicao - achou[0].length);
    // O espaço de largura zero deixa o cursor fora do trecho formatado, para o texto seguinte sair normal.
    document.execCommand("insertHTML", false, `<${formato.tag}>${escapeHtml(achou[1])}</${formato.tag}>​`);
    return;
  }
}

// Campo de texto formatado que já mostra o resultado enquanto se escreve (sem barra nem aba de visualização).
// O texto é guardado com marcas simples (**negrito**, - lista) e o conteúdo colado entra sempre como texto puro.
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

  // O navegador não tem comando pronto para código: marca o trecho selecionado (ou tira a marca se já estiver nela).
  function alternarCodigo() {
    const selecao = window.getSelection();
    const no = selecao?.anchorNode;
    if (!selecao || !no || !areaRef.current?.contains(no)) return;
    const elemento = no.nodeType === Node.TEXT_NODE ? no.parentElement : (no as HTMLElement);
    const codigo = elemento?.closest("code");
    if (codigo && areaRef.current.contains(codigo)) {
      selecao.selectAllChildren(codigo);
      const texto = codigo.textContent ?? "";
      document.execCommand("insertHTML", false, `${escapeHtml(texto)}`);
      codigo.parentElement?.querySelectorAll("code:empty").forEach((vazio) => vazio.remove());
    } else if (!selecao.isCollapsed) {
      document.execCommand("insertHTML", false, `<code>${escapeHtml(selecao.toString())}</code>​`);
    }
  }

  function comando(nome: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList" | "code") {
    areaRef.current?.focus();
    if (nome === "code") alternarCodigo();
    else document.execCommand(nome);
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

  const exemplo = (codigo: string, resultado: React.ReactNode, comEspaco = false) => (
    <li className="flex items-center gap-1.5 rounded-md bg-background px-2 py-1">
      <code className="font-mono text-text">{codigo}</code>
      {comEspaco ? <span>+ {t("richText.space")}</span> : null}
      <span aria-hidden="true">→</span>
      <span className="text-text">{resultado}</span>
    </li>
  );
  const amostra = t("richText.sample");

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id="rich-editor-label" className="text-base font-semibold text-text">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {botao("bold", t("richText.bold"), Bold)}
          {botao("italic", t("richText.italic"), Italic)}
          {botao("code", t("richText.code"), Code)}
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
        className={`${inputClassName} block min-h-28 whitespace-pre-wrap break-words py-3 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_em]:italic [&_em]:[font-synthesis:style] [&_i]:italic [&_i]:[font-synthesis:style] [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6`}
        onInput={(event) => {
          if (areaRef.current) aplicarAtalhos(areaRef.current, event.nativeEvent as InputEvent);
          sincronizar();
        }}
        onBlur={sincronizar}
        onPaste={(event) => {
          // Cola só o texto, sem trazer a formatação de outros sites.
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        }}
      />
      <div className="grid gap-1.5 text-sm text-muted">
        <span>{t("richText.shortcuts")}</span>
        <ul className="flex flex-wrap gap-2">
          {exemplo(`**${amostra}**`, <strong>{t("richText.exBold")}</strong>)}
          {exemplo(`*${amostra}*`, <em className="[font-synthesis:style]">{t("richText.exItalic")}</em>)}
          {exemplo(`\`${amostra}\``, <code className="rounded bg-surface px-1 font-mono">{t("richText.exCode")}</code>)}
          {exemplo("-", <>• {t("richText.exList")}</>, true)}
          {exemplo("1.", <>1. {t("richText.exNumbered")}</>, true)}
        </ul>
      </div>
    </div>
  );
}
