import { describe, expect, it } from "vitest";

import { getSafeInternalRedirect, navigationItems, navigationSectionLabels } from "./navigation";

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

describe("organização do menu", () => {
  const desktopItems = navigationItems.filter((item) => item.desktopSection !== "account");
  const sorted = [...desktopItems].sort((a, b) => a.desktopOrder - b.desktopOrder);

  it("não repete a ordem do menu lateral", () => {
    const orders = desktopItems.map((item) => item.desktopOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("mantém cada grupo junto, na ordem Trabalho, Recursos, Pessoas e Gestão", () => {
    const sections = sorted.map((item) => item.desktopSection);
    const unique = sections.filter((section, index) => section !== sections[index - 1]);
    expect(unique).toEqual(["main", "work", "resources", "people", "admin"]);
    expect(navigationSectionLabels.work).toBe("Trabalho");
    expect(navigationSectionLabels.resources).toBe("Recursos");
    expect(navigationSectionLabels.people).toBe("Pessoas");
    expect(navigationSectionLabels.admin).toBe("Gestão");
  });

  it("deixa a gestão só para o coordenador", () => {
    const admin = desktopItems.filter((item) => item.desktopSection === "admin");
    expect(admin.length).toBeGreaterThan(0);
    expect(admin.every((item) => item.desktopRole === "coordinator")).toBe(true);
  });

  it("não repete a ordem no menu móvel secundário", () => {
    const orders = navigationItems.filter((item) => item.mobilePlacement === "secondary").map((item) => item.mobileOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });
});
