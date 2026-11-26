import { describe, expect, it } from "vitest";

import { extractMentions, filterMentionable, getMentionQuery, insertMention, splitMentions } from "./taskComments";

const people = [
  { id: "ana", full_name: "Ana" },
  { id: "ana-souza", full_name: "Ana Souza" },
  { id: "joao", full_name: "João Pedro Lima" },
];

describe("citação enquanto se digita", () => {
  it("acha o @ que termina no cursor", () => {
    expect(getMentionQuery("oi @jo", 6)).toEqual({ start: 3, query: "jo" });
    expect(getMentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(getMentionQuery("linha\n@a depois", 8)).toEqual({ start: 6, query: "a" });
  });

  it("ignora e-mails e um @ já encerrado", () => {
    expect(getMentionQuery("lab@unifesp", 11)).toBeNull();
    expect(getMentionQuery("@ana ok", 7)).toBeNull();
    expect(getMentionQuery("sem arroba", 10)).toBeNull();
  });

  it("sugere por qualquer parte do nome, sem se importar com acento", () => {
    expect(filterMentionable(people, "joao").map((person) => person.id)).toEqual(["joao"]);
    expect(filterMentionable(people, "li").map((person) => person.id)).toEqual(["joao"]);
    expect(filterMentionable(people, "AN").map((person) => person.id)).toEqual(["ana", "ana-souza"]);
    expect(filterMentionable(people, "xyz")).toEqual([]);
  });

  it("escreve o nome completo no lugar do que foi digitado", () => {
    expect(insertMention("oi @jo, tudo?", 3, 6, "João Pedro Lima")).toEqual({ text: "oi @João Pedro Lima , tudo?", caret: 20 });
    expect(insertMention("@an depois", 0, 3, "Ana")).toEqual({ text: "@Ana depois", caret: 5 });
  });
});

describe("citações no texto", () => {
  it("prefere o nome mais longo e separa os trechos", () => {
    expect(splitMentions("oi @Ana Souza e @ana!", people)).toEqual([
      { text: "oi ", personId: null },
      { text: "@Ana Souza", personId: "ana-souza" },
      { text: " e ", personId: null },
      { text: "@ana", personId: "ana" },
      { text: "!", personId: null },
    ]);
  });

  it("não confunde e-mail nem nome que continua", () => {
    expect(extractMentions("escreva para x@Ana ou para @Anabela", people)).toEqual([]);
  });

  it("cita cada pessoa uma vez", () => {
    expect(extractMentions("@João Pedro Lima, @João Pedro Lima e @Ana", people)).toEqual(["joao", "ana"]);
  });
});
