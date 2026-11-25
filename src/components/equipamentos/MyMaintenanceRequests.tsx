import { useT } from "../../i18n";
import { Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../lib/auth";
import { canMaintain, getTimezonePadrao } from "../../lib/domain";
import { formatMaintenanceDateTime } from "../../lib/maintenance";
import {
  getMaintenanceRequestStatusLabel,
  getMaintenanceRequestStatusVariant,
  getMaintenanceUrgencyLabel,
  getMaintenanceUrgencyVariant,
  getMyRequestGroups,
  type MaintenanceRequest,
} from "../../lib/maintenanceRequests";
import { listMaintenanceRequests } from "../../lib/supabaseRepository";
import { MAINTENANCE_REQUESTS_CHANGED_EVENT } from "../layout/AttentionProvider";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

const VISIBLE_PER_GROUP = 5;

function RequestRow({ request, timezone }: { request: MaintenanceRequest; timezone: string }) {
  const t = useT();
  return (
    <li>
      <Link
        to="/equipamentos?vista=chamados"
        className="grid gap-1 rounded-lg border border-border bg-background p-3 transition hover:border-primary"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 break-words text-base font-bold text-text">{request.equipment_name}</p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={getMaintenanceUrgencyLabel(request.urgency)} variant={getMaintenanceUrgencyVariant(request.urgency)} />
            <StatusBadge label={getMaintenanceRequestStatusLabel(request.status)} variant={getMaintenanceRequestStatusVariant(request.status)} />
          </div>
        </div>
        <p className="break-words text-sm text-text">
          {request.description.length > 140 ? `${request.description.slice(0, 137)}...` : request.description}
        </p>
        <p className="text-sm text-muted">
          {t("myRequests.openedBy", { name: request.requested_by_name ?? t("myRequests.someone"), date: formatMaintenanceDateTime(request.created_at, timezone) })}
          {request.assigned_to_name ? t("myRequests.assignee", { name: request.assigned_to_name }) : ""}
        </p>
      </Link>
    </li>
  );
}

function Group({ title, requests, timezone }: { title: string; requests: MaintenanceRequest[]; timezone: string }) {
  const t = useT();
  if (requests.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{title}</p>
      <ul className="grid gap-2">
        {requests.slice(0, VISIBLE_PER_GROUP).map((request) => (
          <RequestRow key={request.id} request={request} timezone={timezone} />
        ))}
      </ul>
      {requests.length > VISIBLE_PER_GROUP ? (
        <Link to="/equipamentos?vista=chamados" className="mt-2 inline-block text-sm font-semibold text-primary underline">
          {t("myRequests.seeMore", { count: requests.length - VISIBLE_PER_GROUP })}
        </Link>
      ) : null}
    </div>
  );
}

// Bloco do Dashboard: chamados que a pessoa precisa atender (responsáveis) e os que ela mesma abriu.
export function MyMaintenanceRequests() {
  const t = useT();
  const { profile, labSettings } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const [requests, setRequests] = useState<MaintenanceRequest[] | null>(null);
  const profileId = profile?.id ?? null;
  const podeManter = canMaintain(profile);

  useEffect(() => {
    let ativo = true;
    const carregar = () => {
      listMaintenanceRequests()
        .then((data) => ativo && setRequests(data))
        .catch(() => undefined);
    };
    carregar();
    window.addEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, carregar);
    document.addEventListener("visibilitychange", carregar);
    return () => {
      ativo = false;
      window.removeEventListener(MAINTENANCE_REQUESTS_CHANGED_EVENT, carregar);
      document.removeEventListener("visibilitychange", carregar);
    };
  }, []);

  if (!requests || !profileId) return null;
  const { toHandle, mine } = getMyRequestGroups(requests, profileId, podeManter);
  if (toHandle.length === 0 && mine.length === 0) return null;

  return (
    <section>
      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary-soft p-2 text-primary">
            <Wrench className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-text">{t("myRequests.title")}</h3>
            <p className="mt-1 text-base text-muted">
              {podeManter ? t("myRequests.hintMaintainer") : t("myRequests.hintUser")}
            </p>
          </div>
        </div>
        <Group title={t("myRequests.toHandle")} requests={toHandle} timezone={timezone} />
        <Group title={t("myRequests.mine")} requests={mine} timezone={timezone} />
      </Card>
    </section>
  );
}
