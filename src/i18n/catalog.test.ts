import { describe, expect, it } from "vitest";

import { navigationItems } from "../lib/navigation";
import { dictionaries } from "./catalog";
import { navLabelKey } from "./navLabels";
import { translate } from "./index";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("catálogo de traduções", () => {
  const keys = Object.keys(dictionaries["pt-BR"]);

  it("não tem textos vazios em nenhum idioma", () => {
    for (const locale of Object.keys(dictionaries) as (keyof typeof dictionaries)[]) {
      for (const key of keys) {
        expect(dictionaries[locale][key as keyof (typeof dictionaries)["pt-BR"]].trim(), `${locale}:${key}`).not.toBe("");
      }
    }
  });

  it("usa as mesmas variáveis {x} nos três idiomas", () => {
    for (const key of keys) {
      const k = key as keyof (typeof dictionaries)["pt-BR"];
      const base = placeholders(dictionaries["pt-BR"][k]);
      expect(placeholders(dictionaries.en[k]), `en:${key}`).toEqual(base);
      expect(placeholders(dictionaries.es[k]), `es:${key}`).toEqual(base);
    }
  });

  it("tem rótulo traduzido para todo item de navegação", () => {
    for (const item of navigationItems) {
      expect(dictionaries["pt-BR"][navLabelKey(item, "desktop")], item.path).toBe(item.desktopLabel);
      expect(dictionaries["pt-BR"][navLabelKey(item, "mobile")], item.path).toBe(item.mobileLabel);
    }
  });

  it("interpola variáveis", () => {
    expect(translate("en", "common.pending", { count: 3 })).toBe("3 pending");
    expect(translate("es", "common.pending", { count: 3 })).toBe("3 pendiente(s)");
  });
});
