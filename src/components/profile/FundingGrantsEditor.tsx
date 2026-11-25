import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { t } from "../../i18n";
import { emptyGrant, fundingAgencyOptions, type FundingAgency, type FundingGrant } from "../../lib/domain";
import type { ProjectDirectoryEntry } from "../../lib/projects";
import { Button } from "../ui/Button";
import { inputClassName } from "../ui/formStyles";

type FundingGrantsEditorProps = {
  value: FundingGrant[];
  onChange: (grants: FundingGrant[]) => void;
  /** Projetos que podem receber a bolsa (os abertos, mais o já escolhido). */
  projects: ProjectDirectoryEntry[];
  onRequestJoin: (projectId: string) => void;
  joiningProjectId: string | null;
  disabled?: boolean;
};

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

export function FundingGrantsEditor({ disabled, joiningProjectId, onChange, onRequestJoin, projects, value }: FundingGrantsEditorProps) {
  function updateGrant(index: number, patch: Partial<FundingGrant>) {
    onChange(value.map((grant, i) => (i === index ? { ...grant, ...patch } : grant)));
  }

  return (
    <div className="grid gap-3">
      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background p-3 text-base text-muted">{t("grants.none")}</p>
      ) : (
        value.map((grant, index) => {
          const project = projects.find((item) => item.id === grant.project_id);
          return (
            <div key={index} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-bold text-text">{t("grants.itemTitle", { n: index + 1 })}</p>
                <Button
                  aria-label={t("grants.remove")}
                  className="min-h-9 px-3 py-2 text-sm"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  variant="danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("grants.project")}>
                  <select
                    className={inputClassName}
                    disabled={disabled}
                    onChange={(event) => updateGrant(index, { project_id: event.target.value || null })}
                    value={grant.project_id ?? ""}
                  >
                    <option value="">{t("grants.chooseProject")}</option>
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.is_member ? "" : ` (${t("grants.notMember")})`}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t("grants.agency")}>
                  <select
                    className={inputClassName}
                    disabled={disabled}
                    onChange={(event) => {
                      const agency = event.target.value as FundingAgency;
                      updateGrant(index, { agency, agency_other: agency === "other" ? grant.agency_other : null });
                    }}
                    value={grant.agency === "sus" ? "fap" : grant.agency}
                  >
                    {fundingAgencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {project && !project.is_member ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning bg-warning-soft p-3 text-sm text-text">
                  <span className="min-w-0">{project.my_request_status === "pending" ? t("grants.joinPending") : t("grants.joinHint")}</span>
                  {project.my_request_status === "pending" ? null : (
                    <Button
                      className="min-h-9 px-3 py-2 text-sm"
                      disabled={disabled || joiningProjectId === project.id}
                      onClick={() => onRequestJoin(project.id)}
                      variant="secondary"
                    >
                      {t("grants.requestJoin")}
                    </Button>
                  )}
                </div>
              ) : null}

              {grant.agency === "other" ? (
                <Field label={t("grants.whichAgency")}>
                  <input
                    className={inputClassName}
                    disabled={disabled}
                    maxLength={120}
                    onChange={(event) => updateGrant(index, { agency_other: event.target.value })}
                    value={grant.agency_other ?? ""}
                  />
                </Field>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label={t("grants.monthlyValue")}>
                  <input
                    className={inputClassName}
                    disabled={disabled}
                    inputMode="decimal"
                    min={0}
                    onChange={(event) => updateGrant(index, { monthly_value: event.target.value ? Number(event.target.value) : null })}
                    step="0.01"
                    type="number"
                    value={grant.monthly_value ?? ""}
                  />
                </Field>
                <Field label={t("grants.weeklyHours")}>
                  <input
                    className={inputClassName}
                    disabled={disabled}
                    inputMode="numeric"
                    max={60}
                    min={1}
                    onChange={(event) => updateGrant(index, { weekly_hours: event.target.value ? Number(event.target.value) : null })}
                    type="number"
                    value={grant.weekly_hours ?? ""}
                  />
                </Field>
                <Field label={t("grants.startDate")}>
                  <input
                    className={inputClassName}
                    disabled={disabled}
                    onChange={(event) => updateGrant(index, { start_date: event.target.value || null })}
                    type="date"
                    value={grant.start_date ?? ""}
                  />
                </Field>
                <Field label={t("grants.endDate")}>
                  <input
                    className={inputClassName}
                    disabled={disabled}
                    min={grant.start_date ?? undefined}
                    onChange={(event) => updateGrant(index, { end_date: event.target.value || null })}
                    type="date"
                    value={grant.end_date ?? ""}
                  />
                </Field>
              </div>

              <Field label={t("grants.processNumber")}>
                <input
                  className={inputClassName}
                  disabled={disabled}
                  maxLength={60}
                  onChange={(event) => updateGrant(index, { process_number: event.target.value || null })}
                  placeholder={t("profile.optional")}
                  value={grant.process_number ?? ""}
                />
              </Field>
            </div>
          );
        })
      )}

      <div>
        <Button className="min-h-9 px-3 py-2 text-sm" disabled={disabled} onClick={() => onChange([...value, emptyGrant()])} variant="secondary">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("grants.add")}
        </Button>
      </div>
    </div>
  );
}
