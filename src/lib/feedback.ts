import { t } from "../i18n";
import type { StatusVariant } from "../components/ui/StatusBadge";

export type FeedbackKind = "suggestion" | "bug" | "other";

export const feedbackKindOptions: Array<{ value: FeedbackKind; label: string; hint: string }> = [
  { value: "bug", get label() { return t("opt.feedbackKindOptions.bug"); }, get hint() { return t("opt.feedbackKindOptions.bug.hint"); } },
  { value: "suggestion", get label() { return t("opt.feedbackKindOptions.suggestion"); }, get hint() { return t("opt.feedbackKindOptions.suggestion.hint"); } },
  { value: "other", get label() { return t("opt.feedbackKindOptions.other"); }, get hint() { return t("opt.feedbackKindOptions.other.hint"); } },
];

export function getFeedbackKindLabel(kind: FeedbackKind) {
  return feedbackKindOptions.find((option) => option.value === kind)?.label ?? kind;
}

export function getFeedbackKindVariant(kind: FeedbackKind): StatusVariant {
  if (kind === "bug") return "danger";
  if (kind === "suggestion") return "info";
  return "neutral";
}

export type FeedbackStatus = "new" | "seen" | "planned" | "done" | "dismissed";

export const feedbackStatusOptions: Array<{ value: FeedbackStatus; label: string }> = [
  { value: "new", get label() { return t("opt.feedbackStatusOptions.new"); } },
  { value: "seen", get label() { return t("opt.feedbackStatusOptions.seen"); } },
  { value: "planned", get label() { return t("opt.feedbackStatusOptions.planned"); } },
  { value: "done", get label() { return t("opt.feedbackStatusOptions.done"); } },
  { value: "dismissed", get label() { return t("opt.feedbackStatusOptions.dismissed"); } },
];

export function getFeedbackStatusLabel(status: FeedbackStatus) {
  return feedbackStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getFeedbackStatusVariant(status: FeedbackStatus): StatusVariant {
  if (status === "new") return "warning";
  if (status === "planned") return "info";
  if (status === "done") return "success";
  return "neutral";
}

export type FeedbackReport = {
  id: string;
  kind: FeedbackKind;
  message: string;
  page_path: string | null;
  user_agent: string | null;
  status: FeedbackStatus;
  coordinator_note: string | null;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
};

export const FEEDBACK_MIN_LENGTH = 3;
export const FEEDBACK_MAX_LENGTH = 4000;

// Devolve a mensagem de erro, ou null se o texto serve.
export function validateFeedbackMessage(message: string) {
  const length = message.trim().length;
  if (length < FEEDBACK_MIN_LENGTH) return t("feedback.errShort");
  if (length > FEEDBACK_MAX_LENGTH) return t("feedback.errLong", { max: FEEDBACK_MAX_LENGTH });
  return null;
}

// Página e navegador de quem enviou, cortados no limite que o banco aceita.
export function buildFeedbackContext(pagePath: string, userAgent: string) {
  return { pagePath: pagePath.slice(0, 500), userAgent: userAgent.slice(0, 500) };
}

// Pendente = ainda pede atenção (nova, vista ou planejada).
export function isFeedbackPending(status: FeedbackStatus) {
  return status === "new" || status === "seen" || status === "planned";
}

export type FeedbackFilters = {
  kind: FeedbackKind | "all";
  status: FeedbackStatus | "pending" | "all";
  search: string;
};

export function filterFeedback(reports: FeedbackReport[], filters: FeedbackFilters) {
  const search = filters.search.trim().toLowerCase();
  return reports.filter((report) => {
    if (filters.kind !== "all" && report.kind !== filters.kind) return false;
    if (filters.status === "pending" && !isFeedbackPending(report.status)) return false;
    if (filters.status !== "pending" && filters.status !== "all" && report.status !== filters.status) return false;
    if (!search) return true;
    return [report.message, report.author_name, report.page_path, report.coordinator_note]
      .filter(Boolean)
      .some((value) => (value as string).toLowerCase().includes(search));
  });
}

// As novas primeiro; dentro de cada grupo, as mais recentes.
export function sortFeedback(reports: FeedbackReport[]) {
  const rank = (report: FeedbackReport) => (report.status === "new" ? 0 : isFeedbackPending(report.status) ? 1 : 2);
  return [...reports].sort(
    (a, b) => rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getFeedbackErrorMessage(error: unknown) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (text.includes("feedback_reports_message_check")) return t("feedback.errCheck");
  if (text.includes("row-level security")) return t("feedback.errRls");
  return text || t("feedback.errFallback");
}
