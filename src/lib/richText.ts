// Texto formatado simples (um subconjunto de Markdown) para descrições de tarefas: negrito, itálico, código,
// links, listas com marcadores e numeradas. Nada de HTML: o texto vira nós que o React desenha, então não há
// como injetar código.

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold" | "italic"; children: InlineNode[] }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

const INLINE = /\*\*(.+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+?)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/;

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let rest = text;
  while (rest) {
    const match = INLINE.exec(rest);
    if (!match) {
      nodes.push({ type: "text", text: rest });
      break;
    }
    if (match.index > 0) nodes.push({ type: "text", text: rest.slice(0, match.index) });
    if (match[1] !== undefined) nodes.push({ type: "bold", children: parseInline(match[1]) });
    else if (match[2] !== undefined) nodes.push({ type: "italic", children: parseInline(match[2]) });
    else if (match[3] !== undefined) nodes.push({ type: "code", text: match[3] });
    else nodes.push({ type: "link", text: match[4], href: match[5] });
    rest = rest.slice(match.index + match[0].length);
  }
  return nodes;
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseRichText(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const last = blocks[blocks.length - 1];
    if (bullet || numbered) {
      const ordered = !bullet;
      const content = parseInline((bullet ?? numbered)![1]);
      if (last && last.type === "list" && last.ordered === ordered) last.items.push(content);
      else blocks.push({ type: "list", ordered, items: [content] });
    } else if (line.trim() === "") {
      // Linha em branco separa os blocos.
      if (last) blocks.push({ type: "paragraph", lines: [] });
    } else if (last && last.type === "paragraph") {
      last.lines.push(parseInline(line));
    } else {
      blocks.push({ type: "paragraph", lines: [parseInline(line)] });
    }
  }
  return blocks.filter((block) => block.type !== "paragraph" || block.lines.length > 0);
}

export type RichFormat = "bold" | "italic" | "bullet" | "numbered";

// Aplica a formatação da barra de ferramentas ao trecho selecionado e devolve o novo texto e a nova seleção.
export function applyRichFormat(value: string, start: number, end: number, format: RichFormat) {
  if (format === "bold" || format === "italic") {
    const mark = format === "bold" ? "**" : "*";
    const selected = value.slice(start, end);
    const wrapped = value.slice(start - mark.length, start) === mark && value.slice(end, end + mark.length) === mark;
    if (wrapped) {
      // Já está marcado: tira a marca.
      return {
        value: value.slice(0, start - mark.length) + selected + value.slice(end + mark.length),
        start: start - mark.length,
        end: end - mark.length,
      };
    }
    return {
      value: value.slice(0, start) + mark + selected + mark + value.slice(end),
      start: start + mark.length,
      end: end + mark.length,
    };
  }

  // Listas: age nas linhas inteiras que a seleção toca.
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = value.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const pattern = format === "bullet" ? BULLET : NUMBERED;
  const allMarked = lines.every((line) => pattern.test(line));
  const changed = lines.map((line, index) => {
    const plain = line.replace(BULLET, "$1").replace(NUMBERED, "$1");
    if (allMarked) return plain;
    return (format === "bullet" ? "- " : `${index + 1}. `) + plain;
  });
  const block = changed.join("\n");
  return { value: value.slice(0, lineStart) + block + value.slice(lineEnd), start: lineStart, end: lineStart + block.length };
}
