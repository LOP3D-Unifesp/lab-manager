import { describe, expect, it } from "vitest";

import { parseInline, parseRichText, serializeRichText, type DomLike } from "./richText";

describe("texto formatado", () => {
  it("reconhece negrito, itálico, código e links", () => {
    expect(parseInline("a **b** *c* `d` [e](https://x.com)")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " " },
      { type: "italic", children: [{ type: "text", text: "c" }] },
      { type: "text", text: " " },
      { type: "code", text: "d" },
      { type: "text", text: " " },
      { type: "link", text: "e", href: "https://x.com" },
    ]);
  });

  it("não cria link para endereços que não são http(s)", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ type: "text", text: "[x](javascript:alert(1))" }]);
  });

  it("deixa HTML como texto comum", () => {
    expect(parseInline("<b>oi</b>")).toEqual([{ type: "text", text: "<b>oi</b>" }]);
  });

  it("agrupa parágrafos e listas", () => {
    const blocks = parseRichText("Intro\nsegunda linha\n\n- um\n- dois\n\n1. a\n2. b");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "list", "list"]);
    expect(blocks[0].type === "paragraph" && blocks[0].lines).toHaveLength(2);
    expect(blocks[1].type === "list" && !blocks[1].ordered && blocks[1].items).toHaveLength(2);
    expect(blocks[2].type === "list" && blocks[2].ordered && blocks[2].items).toHaveLength(2);
  });

  it("volta o conteúdo do editor para texto com marcas", () => {
    const text = (value: string): DomLike => ({ nodeName: "#text", nodeType: 3, textContent: value, childNodes: [] });
    const el = (name: string, ...children: DomLike[]): DomLike => ({
      nodeName: name,
      nodeType: 1,
      textContent: null,
      childNodes: children,
      getAttribute: (attr) => (attr === "href" ? "https://x.com" : null),
    });
    const root = el(
      "DIV",
      text("Oi "),
      el("B", text("negrito")),
      el("DIV", text("linha "), el("I", text("itálica"))),
      el("DIV", el("BR")),
      el("UL", el("LI", text("um")), el("LI", el("A", text("site")))),
      el("OL", el("LI", text("a")), el("LI", text("b"))),
    );
    expect(serializeRichText(root)).toBe("Oi **negrito**\nlinha *itálica*\n\n- um\n- [site](https://x.com)\n1. a\n2. b");
  });
});
