import { describe, expect, it } from "vitest";

import { getSafeInternalRedirect, navigationItems } from "./navigation";

describe("redirecionamento interno", () => {
  it("preserva apenas caminhos internos normais", () => {
    expect(getSafeInternalRedirect("/reservas?data=2026-08-19")).toBe("/reservas?data=2026-08-19");
    expect(getSafeInternalRedirect("/")).toBe("/");
  });

  it("recusa caminhos absolutos e variantes com barra invertida", () => {
    expect(getSafeInternalRedirect("//example.com")).toBe("/");
    expect(getSafeInternalRedirect("/\\example.com")).toBe("/");
    expect(getSafeInternalRedirect("/%5Cexample.com")).toBe("/");
    expect(getSafeInternalRedirect("https://example.com")).toBe("/");
  });
});

describe("navegação administrativa", () => {
  it("expõe usuários como área própria e mantém administração em rota exata", () => {
    expect(navigationItems.some((item) => item.path === "/usuarios" && item.desktopLabel === "Usuários")).toBe(true);
    expect(navigationItems.some((item) => item.path === "/administracao/convites")).toBe(false);
  });
});
