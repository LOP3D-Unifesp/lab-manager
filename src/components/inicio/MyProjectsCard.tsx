import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import { getProjectStatusLabel, getProjectStatusVariant, type ProjectDirectoryEntry } from "../../lib/projects";
import { StatusBadge } from "../ui/StatusBadge";
import { HomeCard, HomeEmpty } from "./HomeCard";

// Projetos de que a pessoa participa e pedidos de entrada que ela fez e ainda esperam resposta.
export function MyProjectsCard({ directory }: { directory: ProjectDirectoryEntry[] }) {
  const t = useT();
  const mine = directory.filter((entry) => entry.is_member);
  const waiting = directory.filter((entry) => !entry.is_member && entry.my_request_id);

  return (
    <HomeCard title={t("home.myProjects")} to="/projetos">
      {mine.length === 0 && waiting.length === 0 ? (
        <HomeEmpty>{t("home.noProjects")}</HomeEmpty>
      ) : (
        <ul className="grid gap-2">
          {mine.map((entry) => (
            <li key={entry.id}>
              <Link to={`/projetos/${entry.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 transition hover:border-primary">
                <p className="min-w-0 break-words text-base font-bold text-text">{entry.name}</p>
                <StatusBadge label={getProjectStatusLabel(entry.status)} variant={getProjectStatusVariant(entry.status)} />
              </Link>
            </li>
          ))}
          {waiting.map((entry) => (
            <li key={entry.id}>
              <Link to={`/projetos/${entry.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-background p-3 transition hover:border-primary">
                <p className="min-w-0 break-words text-base font-semibold text-text">{entry.name}</p>
                <StatusBadge label={t("home.joinWaiting")} variant="warning" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}
