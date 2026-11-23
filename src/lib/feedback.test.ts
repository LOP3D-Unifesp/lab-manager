import { describe, expect, it } from "vitest";

import {
  buildFeedbackContext,
  filterFeedback,
  getFeedbackErrorMessage,
  isFeedbackPending,
  sortFeedback,
  validateFeedbackMessage,
  type FeedbackFilters,
  type FeedbackReport,
} from "./feedback";

function report(overrides: Partial<FeedbackReport>): FeedbackReport {
  return {
    id: "r",
    kind: "bug",
    message: "Algo quebrou",
    page_path: "/reservas",
    user_agent: null,
    status: "new",
    coordinator_note: null,
    created_at: "2026-06-10T12:00:00Z",
    author_name: "Ana",
    author_email: "ana@example.com",
    ...overrides,
  };
}

describe("mensagem", () => {
  it("exige entre 3 e 4000 caracteres, ignorando espaços nas pontas", () => {
    expect(validateFeedbackMessage("  ab  ")).not.toBeNull();
    expect(validateFeedbackMessage("abc")).toBeNull();
    expect(validateFeedbackMessage("a".repeat(4000))).toBeNull();
    expect(validateFeedbackMessage("a".repeat(4001))).not.toBeNull();
  });

  it("corta a página e o navegador no limite do banco", () => {
    const context = buildFeedbackContext("/x".repeat(400), "u".repeat(600));
    expect(context.pagePath).toHaveLength(500);
    expect(context.userAgent).toHaveLength(500);
  });

  it("traduz erros conhecidos", () => {
    expect(getFeedbackErrorMessage(new Error('violates check constraint "feedback_reports_message_check"'))).toContain("entre 3 e 4000");
    expect(getFeedbackErrorMessage(new Error("outro"))).toBe("outro");
  });
});

describe("lista do coordenador", () => {
  const reports = [
    report({ id: "1", kind: "bug", status: "new", created_at: "2026-06-10T10:00:00Z" }),
    report({ id: "2", kind: "suggestion", status: "planned", message: "Exportar em PDF", created_at: "2026-06-11T10:00:00Z" }),
    report({ id: "3", kind: "bug", status: "done", created_at: "2026-06-12T10:00:00Z" }),
    report({ id: "4", kind: "other", status: "new", created_at: "2026-06-13T10:00:00Z", author_name: "Bia" }),
  ];
  const all: FeedbackFilters = { kind: "all", status: "all", search: "" };
  const ids = (list: FeedbackReport[]) => list.map((r) => r.id);

  it("considera pendentes as novas, vistas e planejadas", () => {
    expect(isFeedbackPending("new")).toBe(true);
    expect(isFeedbackPending("seen")).toBe(true);
    expect(isFeedbackPending("planned")).toBe(true);
    expect(isFeedbackPending("done")).toBe(false);
    expect(isFeedbackPending("dismissed")).toBe(false);
  });

  it("filtra por tipo, situação e busca", () => {
    expect(ids(filterFeedback(reports, { ...all, kind: "bug" }))).toEqual(["1", "3"]);
    expect(ids(filterFeedback(reports, { ...all, status: "pending" }))).toEqual(["1", "2", "4"]);
    expect(ids(filterFeedback(reports, { ...all, status: "done" }))).toEqual(["3"]);
    expect(ids(filterFeedback(reports, { ...all, search: " pdf" }))).toEqual(["2"]);
    expect(ids(filterFeedback(reports, { ...all, search: "bia" }))).toEqual(["4"]);
  });

  it("ordena as novas primeiro, depois as pendentes e por fim as encerradas, das mais recentes às mais antigas", () => {
    expect(ids(sortFeedback(reports))).toEqual(["4", "1", "2", "3"]);
  });
});
