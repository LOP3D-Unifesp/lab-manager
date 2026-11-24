import { describe, expect, it } from "vitest";

import { urlBase64ToUint8Array } from "./push";

describe("urlBase64ToUint8Array", () => {
  it("converte base64url (com - e _) e completa o preenchimento", () => {
    // "subjects?" em base64 padrão é "c3ViamVjdHM/"; em base64url vira "c3ViamVjdHM_".
    const bytes = urlBase64ToUint8Array("c3ViamVjdHM_");
    expect(new TextDecoder().decode(bytes)).toBe("subjects?");
  });

  it("aceita texto sem preenchimento", () => {
    expect(Array.from(urlBase64ToUint8Array("AQID"))).toEqual([1, 2, 3]);
    expect(Array.from(urlBase64ToUint8Array("AQI"))).toEqual([1, 2]);
  });
});
