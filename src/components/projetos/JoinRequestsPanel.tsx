import { useCallback, useEffect, useState } from "react";

import { useT } from "../../i18n";
import { getProjectErrorMessage, type ProjectJoinRequest } from "../../lib/projects";
import { decideProjectJoinRequest, listProjectJoinRequests } from "../../lib/supabaseRepository";
import { Alert } from "../ui/Alert";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type JoinRequestsPanelProps = {
  projectId: string;
  /** Chamado depois de decidir, para recarregar os membros do projeto. */
  onDecided: () => Promise<void>;
};

// Pedidos de entrada pendentes, para coordenadores e membros do projeto aprovarem ou recusarem. Some quando não há pedidos.
export function JoinRequestsPanel({ onDecided, projectId }: JoinRequestsPanelProps) {
  const t = useT();
  const [requests, setRequests] = useState<ProjectJoinRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setRequests(await listProjectJoinRequests(projectId));
  }, [projectId]);

  useEffect(() => {
    let active = true;
    listProjectJoinRequests(projectId)
      .then((list) => active && setRequests(list))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId]);

  async function decide(request: ProjectJoinRequest, approve: boolean) {
    try {
      setBusyId(request.id);
      setError("");
      setNotice("");
      await decideProjectJoinRequest(request.id, approve);
      await load();
      if (approve) await onDecided();
      setNotice(approve ? t("joinReq.approved") : t("joinReq.rejected"));
    } catch (reason) {
      setError(getProjectErrorMessage(reason));
      await load().catch(() => undefined);
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0 && !notice && !error) return null;

  return (
    <Card className="mt-5 p-4 sm:p-5">
      <h3 className="text-lg font-bold text-text">{t("joinReq.title")}</h3>
      <p className="mb-3 text-sm text-muted">{t("joinReq.hint")}</p>
      {error ? (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-3">
          <Alert variant="success">{notice}</Alert>
        </div>
      ) : null}
      <ul className="grid gap-3">
        {requests.map((request) => (
          <li className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between" key={request.id}>
            <div className="flex min-w-0 items-start gap-3">
              <Avatar avatarUrl={request.requester_avatar_url} name={request.requester_name} className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-text">{request.requester_name}</p>
                {request.message ? <p className="mt-0.5 whitespace-pre-line break-words text-sm text-muted">{request.message}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button disabled={busyId === request.id} onClick={() => void decide(request, true)}>
                {t("joinReq.approve")}
              </Button>
              <Button variant="secondary" disabled={busyId === request.id} onClick={() => void decide(request, false)}>
                {t("joinReq.reject")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
