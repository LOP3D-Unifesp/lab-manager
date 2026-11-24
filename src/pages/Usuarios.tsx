import { useT } from "../i18n";
import { useEffect, useState } from "react";
import { ArrowUpRight, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import type { ProfileRole, PublicProfile } from "../lib/domain";
import { listProfiles, updateIsMaintainer, updateProfileRole, updateRequiresBookingApproval } from "../lib/supabaseRepository";

export function UsuariosLayout() {
  const t = useT();
  return <div><PageHeader title={t("users.title")} description={t("users.subtitle")} />
    <nav aria-label={t("users.sections")} className="mb-5 flex gap-2 border-b border-border pb-3">
      <NavLink end className={({ isActive }) => `rounded-lg px-4 py-2 font-semibold ${isActive ? "bg-primary text-white" : "border border-border bg-surface text-primary"}`} to="/usuarios">{t("users.tabActive")}</NavLink>
      <NavLink className={({ isActive }) => `rounded-lg px-4 py-2 font-semibold ${isActive ? "bg-primary text-white" : "border border-border bg-surface text-primary"}`} to="/usuarios/convites">{t("users.tabInvites")}</NavLink>
    </nav><Outlet /></div>;
}

export function UsuariosAtivos() {
  const t = useT();
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  async function reload() { setProfiles(await listProfiles()); }
  useEffect(() => { reload().catch(() => setError(t("users.errLoad"))); }, []);
  async function changeRole(id: string, role: ProfileRole) {
    setSavingId(id); setError(""); setMessage("");
    try { await updateProfileRole(id, role); await reload(); setMessage(t("users.roleUpdated")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("users.errRole")); }
    finally { setSavingId(null); }
  }
  async function toggleRequiresApproval(id: string, current: boolean) {
    setSavingId(id); setError(""); setMessage("");
    try { await updateRequiresBookingApproval(id, !current); await reload(); setMessage(t("users.approvalUpdated")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("users.errApproval")); }
    finally { setSavingId(null); }
  }
  async function toggleMaintainer(id: string, current: boolean) {
    setSavingId(id); setError(""); setMessage("");
    try { await updateIsMaintainer(id, !current); await reload(); setMessage(current ? t("users.maintainerRemoved") : t("users.maintainerMarked")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("users.errMaintainer")); }
    finally { setSavingId(null); }
  }
  return <Card><div className="mb-5 flex items-start gap-3"><div className="rounded-lg bg-primary-soft p-3 text-primary"><Users className="h-5 w-5" /></div><div><h2 className="text-2xl font-bold">{t("users.activeTitle")}</h2><p className="mt-1 text-muted">{t("users.activeHint")}</p></div></div>
    {message ? <p className="mb-4 rounded-lg border border-success bg-success-soft p-3 font-semibold text-success-dark">{message}</p> : null}{error ? <p className="mb-4 rounded-lg border border-danger bg-danger-soft p-3 font-semibold text-danger">{error}</p> : null}
    <div className="grid gap-3">{profiles.map((user) => <div className="rounded-lg border border-border bg-background p-4" key={user.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-lg font-bold">{user.full_name}</p><p className="text-sm text-muted">{user.email}</p></div><div className="flex flex-wrap gap-2"><StatusBadge label={t(user.role === "coordinator" ? "role.coordinator" : "role.researcher")} variant={user.role === "coordinator" ? "success" : "neutral"} />{user.is_maintainer ? <StatusBadge label={t("users.maintenance")} variant="info" /> : null}{user.role === "researcher" ? <StatusBadge label={t(user.requires_booking_approval ? "users.needsApproval" : "users.autoApproval")} variant={user.requires_booking_approval ? "warning" : "neutral"} /> : null}</div></div>
      <div className="mt-4 flex flex-wrap gap-2">{user.role === "researcher" ? <Button className="min-h-9 px-3 py-2 text-sm" disabled={savingId === user.id} onClick={() => changeRole(user.id, "coordinator")}><ArrowUpRight className="mr-2 h-4 w-4" />{t("users.promote")}</Button> : user.id !== profile?.id ? <Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={savingId === user.id} onClick={() => changeRole(user.id, "researcher")}><ArrowUpRight className="mr-2 h-4 w-4 rotate-180" />{t("users.demote")}</Button> : null}{user.role === "researcher" ? <Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={savingId === user.id} onClick={() => toggleRequiresApproval(user.id, user.requires_booking_approval)}>{user.requires_booking_approval ? t("users.makeAuto") : t("users.requireApproval")}</Button> : null}<Button className="min-h-9 px-3 py-2 text-sm" variant="secondary" disabled={savingId === user.id} onClick={() => toggleMaintainer(user.id, user.is_maintainer)}>{user.is_maintainer ? t("users.removeMaintainer") : t("users.markMaintainer")}</Button></div></div>)}</div>
  </Card>;
}
