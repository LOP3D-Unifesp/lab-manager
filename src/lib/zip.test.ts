import { describe, expect, it } from "vitest";

import { crc32, createZip, slugifyFileName } from "./zip";

const text = (value: string) => new TextEncoder().encode(value);

describe("crc32", () => {
  it("bate com o valor conhecido de 'hello'", () => {
    expect(crc32(text("hello")).toString(16)).toBe("3610a686");
  });
});

describe("createZip", () => {
  const zip = createZip(
    [
      { name: "foto-1.jpg", data: text("primeira") },
      { name: "foto-2.jpg", data: text("segunda!") },
    ],
    new Date(2026, 10, 23, 12, 30, 10),
  );
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  it("começa com o cabeçalho local do primeiro arquivo", () => {
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(18, true)).toBe("primeira".length);
    expect(new TextDecoder().decode(zip.slice(30, 40))).toBe("foto-1.jpg");
    expect(new TextDecoder().decode(zip.slice(40, 48))).toBe("primeira");
  });

  it("termina com o registro final apontando para os 2 arquivos", () => {
    const endAt = zip.length - 22;
    expect(view.getUint32(endAt, true)).toBe(0x06054b50);
    expect(view.getUint16(endAt + 10, true)).toBe(2);
    const centralOffset = view.getUint32(endAt + 16, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
  });
});

describe("slugifyFileName", () => {
  it("tira acentos e símbolos", () => {
    expect(slugifyFileName("Impressora Bambu X1C (Lab 1)")).toBe("impressora-bambu-x1c-lab-1");
    expect(slugifyFileName("Máquina Ç")).toBe("maquina-c");
    expect(slugifyFileName("???")).toBe("chamado");
  });
});
