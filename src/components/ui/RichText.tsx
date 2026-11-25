import type { ReactNode } from "react";

import { parseRichText, type InlineNode } from "../../lib/richText";

function renderInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "bold":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "italic":
        return <em key={index}>{renderInline(node.children)}</em>;
      case "code":
        return (
          <code key={index} className="rounded bg-background px-1 py-0.5 text-[0.9em]">
            {node.text}
          </code>
        );
      case "link":
        return (
          <a key={index} className="font-semibold text-primary underline" href={node.href} rel="noopener noreferrer" target="_blank">
            {node.text}
          </a>
        );
      default:
        return node.text;
    }
  });
}

// Mostra o texto formatado (negrito, itálico, listas, links) sem usar HTML.
export function RichText({ text }: { text: string }) {
  const blocks = parseRichText(text);
  return (
    <div className="grid gap-2 break-words text-base text-text">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} className={`${block.ordered ? "list-decimal" : "list-disc"} grid gap-1 pl-6`}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
