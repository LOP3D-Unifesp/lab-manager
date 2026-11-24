import { useT } from "../../i18n";
import { FormEvent, useState } from "react";

import { createProject, updateProject } from "../../lib/supabaseRepository";
import {
  getProjectErrorMessage,
  projectStatusOptions,
  type Project,
  type ProjectStatus,
} from "../../lib/projects";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { inputClassName } from "../ui/formStyles";

type ProjectFormModalProps = {
  project?: Project | null;
  onClose: () => void;
  onSaved: (projectId: string) => void;
};

export function ProjectFormModal({ onClose, onSaved, project }: ProjectFormModalProps) {
  const t = useT();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [startsOn, setStartsOn] = useState(project?.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(project?.ends_on ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErro(t("projectForm.errName"));
      return;
    }
    if (startsOn && endsOn && endsOn < startsOn) {
      setErro(t("projectForm.errDates"));
      return;
    }

    const input = {
      name: trimmedName,
      description: description.trim() || null,
      status,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
    };

    try {
      setSalvando(true);
      setErro("");
      if (project) {
        await updateProject(project.id, input);
        onSaved(project.id);
      } else {
        onSaved(await createProject(input));
      }
    } catch (error) {
      setErro(getProjectErrorMessage(error));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title={project ? t("projectForm.edit") : t("projectForm.new")}
      description={t("projectForm.hint")}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={salvar}>
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("projectForm.name")}
          <input className={inputClassName} required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-2 text-base font-semibold text-text">
          {t("projectForm.description")}
          <textarea
            className={`${inputClassName} min-h-24 py-3`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("projectForm.status")}
            <select className={inputClassName} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {projectStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("projectForm.start")}
            <input className={inputClassName} type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </label>
          <label className="grid gap-2 text-base font-semibold text-text">
            {t("projectForm.end")}
            <input className={inputClassName} type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </label>
        </div>

        {erro ? (
          <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
        ) : null}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? t("common.saving") : t("projectForm.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
