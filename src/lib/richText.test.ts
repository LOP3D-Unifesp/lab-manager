import { describe, expect, it } from "vitest";

import { applyRichFormat, parseInline, parseRichText } from "./richText";

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

  it("aplica e remove negrito na seleção", () => {
    const on = applyRichFormat("olá mundo", 4, 9, "bold");
    expect(on.value).toBe("olá **mundo**");
    expect(applyRichFormat(on.value, on.start, on.end, "bold").value).toBe("olá mundo");
  });

  it("transforma as linhas selecionadas em lista e volta", () => {
    const list = applyRichFormat("a\nb\nc", 0, 5, "bullet");
    expect(list.value).toBe("- a\n- b\n- c");
    expect(applyRichFormat(list.value, list.start, list.end, "bullet").value).toBe("a\nb\nc");
    expect(applyRichFormat("a\nb", 0, 3, "numbered").value).toBe("1. a\n2. b");
  });
});
