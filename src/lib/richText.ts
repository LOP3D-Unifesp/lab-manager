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

// ---------------------------------------------------------------------------
// Editor direto (contentEditable): o que a pessoa vê vira de volta o texto com marcas (**negrito**, - lista...).
// Funciona sobre uma interface mínima de nó, que o DOM do navegador já cumpre (e que dá para simular nos testes).
// ---------------------------------------------------------------------------

export type DomLike = {
  nodeName: string;
  nodeType: number;
  textContent: string | null;
  childNodes: ArrayLike<DomLike>;
  getAttribute?: (name: string) => string | null;
};

const TEXT_NODE = 3;
const BLOCK_TAGS = new Set(["DIV", "P", "UL", "OL", "LI"]);

function serializeInline(node: DomLike): string {
  if (node.nodeType === TEXT_NODE) return (node.textContent ?? "").replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/\n/g, " ");
  const inner = Array.from(node.childNodes).map(serializeInline).join("");
  switch (node.nodeName) {
    case "B":
    case "STRONG":
      return inner.trim() ? `**${inner}**` : inner;
    case "I":
    case "EM":
      return inner.trim() ? `*${inner}*` : inner;
    case "CODE":
      return inner ? `\`${inner}\`` : inner;
    case "A": {
      const href = node.getAttribute?.("href") ?? "";
      return /^https?:\/\//.test(href) && inner ? `[${inner}](${href})` : inner;
    }
    case "BR":
      return "\n";
    default:
      return inner;
  }
}

function collectLines(parent: DomLike, lines: string[]) {
  let current = "";
  const flush = () => {
    lines.push(...current.split("\n"));
    current = "";
  };
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType !== TEXT_NODE && BLOCK_TAGS.has(child.nodeName)) {
      if (current !== "") flush();
      if (child.nodeName === "UL" || child.nodeName === "OL") {
        const ordered = child.nodeName === "OL";
        Array.from(child.childNodes)
          .filter((item) => item.nodeName === "LI")
          .forEach((item, index) => {
            const text = serializeInline(item).replace(/\n+$/, "").replace(/\n/g, " ");
            lines.push(`${ordered ? `${index + 1}.` : "-"} ${text}`);
          });
      } else if (Array.from(child.childNodes).some((inner) => inner.nodeType !== TEXT_NODE && BLOCK_TAGS.has(inner.nodeName))) {
        collectLines(child, lines);
      } else {
        // <div>texto</div> = uma linha; <div><br></div> = linha em branco.
        lines.push(...serializeInline(child).replace(/\n$/, "").split("\n"));
      }
    } else {
      current += serializeInline(child);
    }
  }
  if (current !== "") flush();
}

export function serializeRichText(root: DomLike): string {
  const lines: string[] = [];
  collectLines(root, lines);
  return lines.join("\n").replace(/\n+$/, "");
}
