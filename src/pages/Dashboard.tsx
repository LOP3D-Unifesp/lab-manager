import { useEffect, useMemo, useState } from "react";

import { EquipmentCard } from "../components/inicio/EquipmentCard";
import { DecisionCard } from "../components/inicio/DecisionCard";
import { MyBookingsCard } from "../components/inicio/MyBookingsCard";
import { MyProjectsCard } from "../components/inicio/MyProjectsCard";
import { MyPurchasesCard } from "../components/inicio/MyPurchasesCard";
import { NewsCard } from "../components/inicio/NewsCard";
import { NowCard } from "../components/inicio/NowCard";
import { QuickActions } from "../components/inicio/QuickActions";
import { useAttention } from "../components/layout/AttentionProvider";
import { MyMaintenanceRequests } from "../components/equipamentos/MyMaintenanceRequests";
import { MyTasksBoard } from "../components/projetos/MyTasksBoard";
import { PageHeader } from "../components/ui/PageHeader";
import { formatDateTime, useT } from "../i18n";
import { useCurrentProfile } from "../lib/currentUser";
import { canMaintain, type AvailabilitySlot, type Equipment, type EquipmentBooking } from "../lib/domain";
import { countEquipmentByStatus, getDayPart, getDecisionItems, getFirstName, getMyOpenPurchases, getMyUpcomingBookings } from "../lib/inicio";
import { useLabSchedule } from "../lib/labSchedule";
import type { ProjectDirectoryEntry } from "../lib/projects";
import type { PurchaseRequest } from "../lib/purchases";
import { listAvailability, listBookings, listEquipment, listProjectDirectory, listPurchaseRequests } from "../lib/supabaseRepository";

// Inicial: o centro de comando de cada pessoa. Só o que é dela (próxima reserva, tarefas, pedidos, avisos) e, para
// quem decide, o que espera uma decisão. Os números do laboratório inteiro ficam em Analytics.
export function Dashboard() {
  const t = useT();
  const { periodos } = useLabSchedule();
  const { currentProfile } = useCurrentProfile();
  const attention = useAttention();
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRequest[]>([]);
  const [directory, setDirectory] = useState<ProjectDirectoryEntry[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [erro, setErro] = useState("");
  const now = useMemo(() => new Date(), []);
  const profileId = currentProfile?.id;

  useEffect(() => {
    if (!profileId) return undefined;
    let ativo = true;

    Promise.all([listBookings(), listAvailability(profileId), listPurchaseRequests(), listProjectDirectory(), listEquipment()])
      .then(([bookingsData, availabilityData, purchasesData, directoryData, equipmentData]) => {
        if (!ativo) return;
        setErro("");
        setBookings(bookingsData);
        setAvailability(availabilityData);
        setPurchases(purchasesData);
        setDirectory(directoryData);
        setEquipment(equipmentData);
      })
      .catch((error) => {
        if (ativo) setErro(error instanceof Error ? error.message : t("dashboard.loadError"));
      });

    return () => {
      ativo = false;
    };
  }, [profileId]);

  if (!currentProfile) return null;

  const isCoordinator = currentProfile.role === "coordinator";
  const myBookings = getMyUpcomingBookings(bookings, currentProfile.id, now);
  const myPurchases = getMyOpenPurchases(purchases, currentProfile.id);
  const presence = availability
    .filter((slot) => slot.weekday === now.getDay())
    .map((slot) => `${periodos.find((periodo) => periodo.id === slot.periodo)?.label ?? ""} ${slot.work_mode === "remote" ? t("dashboard.remoteTag") : t("dashboard.onsiteTag")}`.trim())
    .join(", ");
  const decisions = getDecisionItems({
    isCoordinator,
    canMaintain: canMaintain(currentProfile),
    pendingBookings: attention.pendingBookings,
    purchases: attention.purchases,
    urgentPurchases: attention.urgentPurchases,
    maintenanceRequests: attention.maintenanceRequests,
    urgentRequests: attention.urgentRequests,
    feedback: attention.feedback,
    joinRequests: directory.reduce((total, entry) => total + entry.pending_count, 0),
  });
  const firstName = getFirstName(currentProfile.full_name);
  const today = formatDateTime(now, { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="grid gap-5">
      <PageHeader
        title={firstName ? t(`home.greeting.${getDayPart(now.getHours())}`, { name: firstName }) : t("dashboard.title")}
        description={today}
      />

      {erro ? (
        <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
      ) : null}

      <NowCard nextBooking={myBookings[0]} now={now} presence={presence} />
      <QuickActions />
      <DecisionCard items={decisions} />

      <MyTasksBoard isCoordinator={isCoordinator} profileId={currentProfile.id} />
      <MyMaintenanceRequests />

      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        <NewsCard />
        <EquipmentCard counts={countEquipmentByStatus(equipment)} />
        <MyBookingsCard bookings={myBookings} />
        <MyPurchasesCard purchases={myPurchases} />
        <MyProjectsCard directory={directory} />
      </div>
    </div>
  );
}
