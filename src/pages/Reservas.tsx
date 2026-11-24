import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, Clock, History, Pencil, Plus, Printer as PrinterIcon, Trash2, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { BookingLifecycleActions } from "../components/reservas/BookingLifecycleActions";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../lib/auth";
import { useCurrentProfile } from "../lib/currentUser";
import {
  formatAmount,
  getSpoolLabel,
  getSpoolsForBooking,
  parseAmount,
  type MaterialSpool,
} from "../lib/inventory";
import { isProjectOpen, type Project } from "../lib/projects";
import {
  calcularDuracaoMinutos,
  criarDataNoFuso,
  findConflictingBooking,
  findConflictingMaintenanceBlock,
  getBookingStatusLabel,
  getCorReserva,
  getHojeNoFuso,
  getDataNoFuso,
  getHorarioNoFuso,
  getMensagemErroReserva,
  getEquipmentStatusLabel,
  getTimezonePadrao,
  gerarHorariosReserva,
  intervalosSeCruzam,
  equipmentAcceptsMaterial,
  equipmentUsesMaterial,
  reservaApareceNaAgenda,
  reservaBloqueiaHorario,
  reservaPodeSerCancelada,
  reservaPodeSerEditada,
  type BookingStatus,
  type LabSchedulePeriod,
  type MaintenanceBlock,
  type Material,
  type Equipment,
  type EquipmentBooking,
  type EquipmentMaterial,
  type PublicProfile,
} from "../lib/domain";
import {
  cancelBooking,
  createBooking,
  listBookings,
  listLabSchedulePeriods,
  listMaintenanceBlocks,
  listMaterials,
  listEquipmentMaterials,
  listEquipment,
  listProfiles,
  listProjects,
  listSpools,
  recordBookingUsage,
  rejectBooking,
  setBookingStatus,
  updateBooking,
} from "../lib/supabaseRepository";

function formatarDataHora(valor: string | undefined, timezone: string) {
  if (!valor) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function formatarHorario(valor: string | undefined, timezone: string) {
  if (!valor) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

export function Reservas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reservaDestacadaId = searchParams.get("reserva");
  const { labSettings } = useAuth();
  const timezone = labSettings?.timezone || getTimezonePadrao();
  const { currentProfile } = useCurrentProfile();
  const isCoordinator = currentProfile?.role === "coordinator";
  const [bookings, setBookings] = useState<EquipmentBooking[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [spools, setSpools] = useState<MaterialSpool[]>([]);
  const [usoPendente, setUsoPendente] = useState<{ reserva: EquipmentBooking; status: BookingStatus } | null>(null);
  const [quantidadeUso, setQuantidadeUso] = useState("");
  const [equipmentMaterials, setEquipmentMaterials] = useState<EquipmentMaterial[]>(
    [],
  );
  const [schedulePeriods, setSchedulePeriods] = useState<LabSchedulePeriod[]>([]);
  const [dataAgenda, setDataAgenda] = useState(getHojeNoFuso(timezone));
  const [modalAberto, setModalAberto] = useState(false);
  const [reservaEmEdicao, setReservaEmEdicao] = useState<EquipmentBooking | null>(null);
  const [reservaParaCancelar, setReservaParaCancelar] =
    useState<EquipmentBooking | null>(null);
  const [reservaParaRejeitar, setReservaParaRejeitar] =
    useState<EquipmentBooking | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novaReserva, setNovaReserva] = useState({
    project_id: "",
    material_id: "",
    spool_id: "",
    duration_hours: "",
    reservation_date: "",
    starts_at: "",
    equipment_id: "",
    notes: "",
  });

  async function carregarDados() {
    const [
      bookingsData,
      maintenanceData,
      equipmentData,
      profilesData,
      materialsData,
      equipmentMaterialsData,
      schedulePeriodsData,
      projectsData,
      spoolsData,
    ] = await Promise.all([
      listBookings(),
      listMaintenanceBlocks(),
      listEquipment(),
      listProfiles(),
      listMaterials(),
      listEquipmentMaterials(),
      listLabSchedulePeriods(),
      listProjects(),
      listSpools(),
    ]);

    setBookings(bookingsData);
    setMaintenanceBlocks(maintenanceData);
    setEquipmentList(equipmentData);
    setProfiles(profilesData);
    setMaterials(materialsData);
    setEquipmentMaterials(equipmentMaterialsData);
    setSchedulePeriods(schedulePeriodsData);
    setProjects(projectsData);
    setSpools(spoolsData);
  }

  useEffect(() => {
    let ativo = true;

    carregarDados().catch((error) => {
      if (ativo) {
        setErro(error instanceof Error ? error.message : "Erro ao carregar.");
      }
    });

    return () => {
      ativo = false;
    };
  }, []);

  // Link do sino do coordenador (/reservas?reserva=<id>): muda a data da agenda
  // para o dia da reserva, rola até o card e mantém o destaque enquanto o
  // parâmetro estiver presente.
  useEffect(() => {
    if (!reservaDestacadaId || bookings.length === 0) {
      return;
    }

    const reserva = bookings.find((item) => item.id === reservaDestacadaId);
    if (!reserva) {
      return;
    }

    setDataAgenda(getDataNoFuso(new Date(reserva.starts_at), timezone));

    const elemento = document.getElementById(`reserva-${reservaDestacadaId}`);
    elemento?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaDestacadaId, bookings]);

  function limparReservaDestacada() {
    if (reservaDestacadaId) {
      setSearchParams({}, { replace: true });
    }
  }

  const impressorasAtivas = useMemo(
    () => equipmentList.filter((equipment) => equipment.status === "active"),
    [equipmentList],
  );

  const materiaisAtivos = useMemo(
    () => materials.filter((material) => material.is_active),
    [materials],
  );

  const reservasPendentes = useMemo(() => {
    return bookings
      .filter((reserva) => reserva.status === "pending")
      .sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }, [bookings]);

  const reservasPorImpressora = useMemo(() => {
    return bookings.reduce<Record<string, EquipmentBooking[]>>(
      (mapa, reserva) => {
        mapa[reserva.equipment_id] = [...(mapa[reserva.equipment_id] ?? []), reserva];
        return mapa;
      },
      {},
    );
  }, [bookings]);

  const manutencoesPorImpressora = useMemo(() => {
    return maintenanceBlocks.reduce<Record<string, MaintenanceBlock[]>>((mapa, block) => {
      mapa[block.equipment_id] = [...(mapa[block.equipment_id] ?? []), block];
      return mapa;
    }, {});
  }, [maintenanceBlocks]);

  const horariosReserva = useMemo(
    () => gerarHorariosReserva(schedulePeriods, bookings, timezone),
    [schedulePeriods, bookings, timezone],
  );

  const duracaoMinutos = calcularDuracaoMinutos(novaReserva.duration_hours);
  const inicioSelecionado =
    novaReserva.reservation_date && novaReserva.starts_at
      ? criarDataNoFuso(novaReserva.reservation_date, novaReserva.starts_at, timezone)
      : null;
  const fimSelecionado =
    inicioSelecionado && duracaoMinutos
      ? new Date(inicioSelecionado.getTime() + duracaoMinutos * 60 * 1000)
      : null;

  const minhasReservasDaData = useMemo(() => {
    if (!currentProfile) {
      return [];
    }

    const inicioDia = criarDataNoFuso(dataAgenda, "00:00", timezone);

    if (!inicioDia) {
      return [];
    }

    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    return bookings
      .filter((reserva) => {
        return (
          reserva.profile_id === currentProfile.id &&
          reservaApareceNaAgenda(reserva) &&
          intervalosSeCruzam(
            inicioDia,
            fimDia,
            new Date(reserva.starts_at),
            new Date(reserva.ends_at),
          )
        );
      })
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }, [bookings, currentProfile, dataAgenda]);

  function getEquipamento(equipmentId: string) {
    return equipmentList.find((item) => item.id === equipmentId);
  }

  // Equipamento cujo tipo não usa material (scanner, cortadora...) aceita a reserva sem material.
  function impressoraAceitaMaterial(equipmentId: string, materialId: string) {
    if (!equipmentUsesMaterial(getEquipamento(equipmentId))) return true;
    return equipmentAcceptsMaterial(equipmentMaterials, equipmentId, materialId);
  }

  function getMateriaisDaImpressora(equipmentId: string) {
    const materialIds = new Set(
      equipmentMaterials
        .filter((item) => item.equipment_id === equipmentId)
        .map((item) => item.material_id),
    );

    return materials.filter((material) => materialIds.has(material.id));
  }

  function horarioSelecionadoJaPassou() {
    if (!inicioSelecionado) {
      return false;
    }

    return inicioSelecionado.getTime() < Date.now();
  }

  function horarioJaPassou(data: string, horario: string) {
    if (!data || !horario) {
      return false;
    }

    const dataHorario = criarDataNoFuso(data, horario, timezone);
    return !dataHorario || dataHorario.getTime() < Date.now();
  }

  // Editing a booking whose start already passed is allowed as long as the
  // start time itself is left untouched (name/material/equipment only).
  const inicioMantidoOriginal =
    Boolean(reservaEmEdicao) &&
    Boolean(inicioSelecionado) &&
    inicioSelecionado!.getTime() === new Date(reservaEmEdicao!.starts_at).getTime();

  function horarioSelecionadoValido() {
    return !horarioSelecionadoJaPassou() || inicioMantidoOriginal;
  }

  function getReservaConflitante(equipmentId: string) {
    if (!inicioSelecionado || !fimSelecionado) {
      return null;
    }

    return findConflictingBooking(
      reservasPorImpressora[equipmentId] ?? [],
      inicioSelecionado,
      fimSelecionado,
      reservaEmEdicao?.id,
    );
  }

  function getManutencaoConflitante(equipmentId: string) {
    if (!inicioSelecionado || !fimSelecionado) return null;
    return findConflictingMaintenanceBlock(
      manutencoesPorImpressora[equipmentId] ?? [],
      inicioSelecionado,
      fimSelecionado,
    );
  }

  function getManutencaoNoHorario(equipmentId: string, horario: string) {
    const inicioHorario = criarDataNoFuso(dataAgenda, horario, timezone);
    if (!inicioHorario) return null;
    const fimHorario = new Date(inicioHorario.getTime() + 30 * 60 * 1000);
    return (manutencoesPorImpressora[equipmentId] ?? []).find((block) =>
      intervalosSeCruzam(inicioHorario, fimHorario, new Date(block.starts_at), new Date(block.ends_at)),
    ) ?? null;
  }

  function getManutencoesDaData(equipmentId: string) {
    const inicioDia = criarDataNoFuso(dataAgenda, "00:00", timezone);
    if (!inicioDia) return [];
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);
    return (manutencoesPorImpressora[equipmentId] ?? [])
      .filter((block) => intervalosSeCruzam(inicioDia, fimDia, new Date(block.starts_at), new Date(block.ends_at)))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }

  function getReservaNoHorario(equipmentId: string, horario: string) {
    const inicioHorario = criarDataNoFuso(dataAgenda, horario, timezone);

    if (!inicioHorario) {
      return null;
    }

    const fimHorario = new Date(inicioHorario.getTime() + 30 * 60 * 1000);

    return (
      (reservasPorImpressora[equipmentId] ?? []).find((reserva) => {
        return (
          reservaBloqueiaHorario(reserva) &&
          intervalosSeCruzam(
            inicioHorario,
            fimHorario,
            new Date(reserva.starts_at),
            new Date(reserva.ends_at),
          )
        );
      }) ?? null
    );
  }

  function getReservasDaData(equipmentId: string) {
    const inicioDia = criarDataNoFuso(dataAgenda, "00:00", timezone);

    if (!inicioDia) {
      return [];
    }

    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    return (reservasPorImpressora[equipmentId] ?? [])
      .filter((reserva) => {
        return (
          reservaApareceNaAgenda(reserva) &&
          intervalosSeCruzam(
            inicioDia,
            fimDia,
            new Date(reserva.starts_at),
            new Date(reserva.ends_at),
          )
        );
      })
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }

  function getNomeResponsavel(profileId?: string) {
    if (!profileId) {
      return "Sem usuário";
    }

    return (
      profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Usuário removido"
    );
  }

  function getNomeImpressora(equipmentId: string) {
    return (
      equipmentList.find((equipment) => equipment.id === equipmentId)?.name ??
      "Equipamento removido"
    );
  }

  function abrirModal() {
    if (!currentProfile) {
      setErro("Entre com um perfil ativo antes de criar uma reserva.");
      return;
    }

    if (impressorasAtivas.length === 0) {
      setErro("Cadastre pelo menos um equipamento ativo antes de reservar.");
      return;
    }

    setErro("");
    setReservaEmEdicao(null);
    setModalAberto(true);
  }

  function podeGerenciarReserva(reserva: EquipmentBooking) {
    return isCoordinator || currentProfile?.id === reserva.profile_id;
  }

  function abrirEdicao(reserva: EquipmentBooking) {
    if (!podeGerenciarReserva(reserva) || !reservaPodeSerEditada(reserva)) return;
    setReservaEmEdicao(reserva);
    setNovaReserva({
      project_id: reserva.project_id ?? "",
      material_id: reserva.material_id ?? "",
      spool_id: reserva.spool_id ?? "",
      duration_hours: String(reserva.estimated_duration_minutes / 60),
      reservation_date: getDataNoFuso(new Date(reserva.starts_at), timezone),
      starts_at: getHorarioNoFuso(new Date(reserva.starts_at), timezone),
      equipment_id: reserva.equipment_id,
      notes: reserva.notes ?? "",
    });
    setErro("");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setReservaEmEdicao(null);
    setErro("");
    setNovaReserva({
      project_id: "",
      material_id: "",
      spool_id: "",
      duration_hours: "",
      reservation_date: "",
      starts_at: "",
      equipment_id: "",
      notes: "",
    });
  }

  function selecionarImpressora(equipment: Equipment) {
    if (equipmentUsesMaterial(equipment)) {
      if (!novaReserva.material_id) {
        setErro("Selecione um material antes de escolher esta impressora.");
        return;
      }

      if (!impressoraAceitaMaterial(equipment.id, novaReserva.material_id)) {
        setErro("Este equipamento não suporta o material selecionado.");
        return;
      }
    }

    if (!horarioSelecionadoValido()) {
      setErro("Não é possível selecionar um horário que já passou.");
      return;
    }

    if (getReservaConflitante(equipment.id)) {
      setErro("O equipamento selecionado não está livre nesse horário.");
      return;
    }

    if (getManutencaoConflitante(equipment.id)) {
      setErro("O equipamento está bloqueado para manutenção nesse horário.");
      return;
    }

    setErro("");
    setNovaReserva((reserva) => ({ ...reserva, equipment_id: equipment.id }));
  }

  const rolosDisponiveis = getSpoolsForBooking(
    spools,
    novaReserva.material_id,
    novaReserva.project_id,
    reservaEmEdicao?.spool_id ?? null,
  );
  const equipamentoEscolhido = getEquipamento(novaReserva.equipment_id);
  const usaMaterial = equipmentUsesMaterial(equipamentoEscolhido);

  async function salvarReserva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectId = novaReserva.project_id;

    if (
      !projectId ||
      (usaMaterial && !novaReserva.material_id) ||
      !novaReserva.reservation_date ||
      !novaReserva.starts_at ||
      !novaReserva.equipment_id ||
      !inicioSelecionado ||
      !fimSelecionado ||
      !duracaoMinutos
    ) {
      setErro(
        "Preencha projeto, equipamento, data, horário e duração entre 0,5h e 24h em passos de 0,5h (e o material, para impressoras).",
      );
      return;
    }

    if (!horarioSelecionadoValido()) {
      setErro("Não é possível reservar um horário que já passou.");
      return;
    }

    if (!impressoraAceitaMaterial(novaReserva.equipment_id, novaReserva.material_id)) {
      setErro("Selecione um equipamento compativel com o material.");
      return;
    }

    try {
      setSalvando(true);
      const bookingParams = {
        equipmentId: novaReserva.equipment_id,
        materialId: usaMaterial ? novaReserva.material_id : null,
        spoolId: usaMaterial ? novaReserva.spool_id || null : null,
        projectId,
        startsAt: inicioSelecionado.toISOString(),
        durationMinutes: duracaoMinutos,
        notes: novaReserva.notes.trim() || null,
      };
      if (reservaEmEdicao) {
        await updateBooking(reservaEmEdicao.id, bookingParams);
      } else {
        await createBooking(bookingParams);
      }
      setDataAgenda(novaReserva.reservation_date);
      await carregarDados();
      fecharModal();
    } catch (error) {
      setErro(getMensagemErroReserva(error));
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(reserva: EquipmentBooking, status: BookingStatus) {
    if (status === "cancelled") {
      setReservaParaCancelar(reserva);
      return;
    }
    if (status === "rejected") {
      setMotivoRejeicao("");
      setReservaParaRejeitar(reserva);
      return;
    }
    if ((status === "completed" || status === "failed") && reserva.spool_id) {
      setQuantidadeUso(reserva.consumed_amount ? String(reserva.consumed_amount) : "");
      setUsoPendente({ reserva, status });
      return;
    }
    try {
      setSalvando(true);
      setErro("");
      await setBookingStatus(reserva.id, status);
      await carregarDados();
    } catch (error) {
      setErro(getMensagemErroReserva(error));
    } finally {
      setSalvando(false);
    }
  }

  // Conclui (ou marca como falha) e, se informado, abate do rolo o que a impressão usou.
  async function confirmarUso(informar: boolean) {
    if (!usoPendente) return;
    const { reserva, status } = usoPendente;
    const quantidade = informar ? parseAmount(quantidadeUso) : null;
    if (informar && quantidade === null) {
      setErro("Informe uma quantidade válida ou conclua sem informar.");
      return;
    }
    try {
      setSalvando(true);
      setErro("");
      await setBookingStatus(reserva.id, status);
      if (quantidade !== null) await recordBookingUsage(reserva.id, quantidade);
      setUsoPendente(null);
      await carregarDados();
    } catch (error) {
      setErro(getMensagemErroReserva(error));
    } finally {
      setSalvando(false);
    }
  }

  async function cancelarReserva(reservaId: string) {
    try {
      setSalvando(true);
      await cancelBooking(reservaId);
      await carregarDados();
      setReservaParaCancelar(null);
    } catch (error) {
      setErro(getMensagemErroReserva(error));
      setReservaParaCancelar(null);
    } finally {
      setSalvando(false);
    }
  }

  async function rejeitarReserva(reservaId: string, motivo: string) {
    try {
      setSalvando(true);
      await rejectBooking(reservaId, motivo.trim() || null);
      await carregarDados();
      setReservaParaRejeitar(null);
    } catch (error) {
      setErro(getMensagemErroReserva(error));
      setReservaParaRejeitar(null);
    } finally {
      setSalvando(false);
    }
  }

  // Projetos em aberto que a pessoa vê (a RLS já limita aos seus, exceto coordenador) e, ao editar,
  // o projeto atual da reserva, mesmo que já tenha sido concluído.
  const projetosDisponiveis = projects
    .filter((projeto) => isProjectOpen(projeto.status) || projeto.id === reservaEmEdicao?.project_id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const formularioReservaCompleto =
    novaReserva.project_id.length > 0 &&
    (!usaMaterial || novaReserva.material_id.length > 0) &&
    novaReserva.reservation_date.length > 0 &&
    novaReserva.starts_at.length > 0 &&
    novaReserva.equipment_id.length > 0 &&
    Boolean(duracaoMinutos) &&
    horarioSelecionadoValido();

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Reservas e manutenções com validação transacional no banco."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {isCoordinator ? (
              <Link to="/reservas/historico">
                <Button fullWidth variant="secondary">
                  <History className="mr-2 h-5 w-5" aria-hidden="true" />
                  Histórico
                </Button>
              </Link>
            ) : (
              <Link to="/reservas/minhas">
                <Button fullWidth variant="secondary">
                  <CalendarCheck className="mr-2 h-5 w-5" aria-hidden="true" />
                  Minhas reservas
                </Button>
              </Link>
            )}
            <Button fullWidth onClick={abrirModal}>
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              Criar reserva
            </Button>
          </div>
        }
      />

      {isCoordinator && reservasPendentes.length > 0 ? (
        <section className="mb-5 rounded-lg border border-warning-dark bg-warning-soft p-4">
          <h3 className="text-xl font-bold text-text">
            Reservas aguardando aprovação ({reservasPendentes.length})
          </h3>
          <div className="mt-3 grid gap-3">
            {reservasPendentes.map((reserva) => (
              <div
                key={reserva.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-base font-bold text-text">{reserva.project_name}</p>
                  <p className="text-sm text-muted">
                    {getNomeResponsavel(reserva.profile_id)} · {getNomeImpressora(reserva.equipment_id)} ·{" "}
                    {formatarDataHora(reserva.starts_at, timezone)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="min-h-9 px-3 py-2 text-sm"
                    disabled={salvando}
                    onClick={() => alterarStatus(reserva, "approved")}
                  >
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    Aprovar
                  </Button>
                  <Button
                    className="min-h-9 px-3 py-2 text-sm"
                    variant="danger"
                    disabled={salvando}
                    onClick={() => alterarStatus(reserva, "rejected")}
                  >
                    <X className="mr-2 h-4 w-4" aria-hidden="true" />
                    Negar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-text">Agenda por equipamento</h3>
          <p className="mt-1 text-base text-muted">
            Horários de reserva e manutenção das {horariosReserva[0]} às{" "}
            {horariosReserva[horariosReserva.length - 1]}, separados por equipamento.
          </p>
        </div>
        <label className="grid gap-2 text-base font-semibold text-text sm:w-56">
          Data
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
            type="date"
            value={dataAgenda}
            onChange={(event) => {
              limparReservaDestacada();
              setDataAgenda(event.target.value);
            }}
          />
        </label>
      </section>

      {erro ? (
        <p className="mb-5 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
          {erro}
        </p>
      ) : null}

      {currentProfile ? (
        <section className="mb-5 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-text">
                Reservas de {currentProfile.first_name}
              </h3>
              <p className="mt-1 text-base text-muted">
                Impressões associadas ao usuário atual nesta data.
              </p>
            </div>
            <StatusBadge
              label={String(minhasReservasDaData.length)}
              variant={minhasReservasDaData.length > 0 ? "info" : "neutral"}
            />
          </div>
          {minhasReservasDaData.length > 0 ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {minhasReservasDaData.map((reserva) => (
                <div
                  key={reserva.id}
                  id={`reserva-${reserva.id}`}
                  className={[
                    "flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2",
                    reserva.id === reservaDestacadaId
                      ? "border-primary ring-2 ring-primary"
                      : "border-border",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-text">
                      {reserva.project_name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      {formatarHorario(reserva.starts_at, timezone)} até{" "}
                      {formatarHorario(reserva.ends_at, timezone)} -{" "}
                      {reserva.equipment?.name ?? "Equipamento removido"}
                      {reserva.material_id ? ` - ${reserva.material?.name ?? "Material removido"}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {reservaPodeSerEditada(reserva) ? (
                      <button
                        type="button"
                        title="Editar reserva"
                        aria-label={`Editar reserva ${reserva.project_name}`}
                        onClick={() => abrirEdicao(reserva)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-primary-soft hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                    {reservaPodeSerCancelada(reserva) ? (
                      <button
                        type="button"
                        title="Cancelar reserva"
                        aria-label={`Cancelar reserva ${reserva.project_name}`}
                        onClick={() => setReservaParaCancelar(reserva)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {equipmentList.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {equipmentList.map((equipment) => {
            const reservasDaData = getReservasDaData(equipment.id);
            const materiaisDaImpressora = getMateriaisDaImpressora(equipment.id);

            return (
              <Card key={equipment.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-text">
                      {equipment.name}
                    </h3>
                    <p className="mt-1 text-base font-semibold text-muted">
                      {equipment.model ?? "Modelo não informado"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">
                      Materiais:{" "}
                      {materiaisDaImpressora.length > 0
                        ? materiaisDaImpressora
                            .map((material) => material.name)
                            .join(", ")
                        : "Nenhum material compativel"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusBadge
                      label={getEquipmentStatusLabel(equipment.status)}
                      variant={equipment.status === "active" ? "success" : "warning"}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {horariosReserva.map((horario) => {
                    const reserva = getReservaNoHorario(equipment.id, horario);
                    const manutencao = getManutencaoNoHorario(equipment.id, horario);

                    return (
                      <div
                        key={horario}
                        className={[
                          "min-h-16 rounded-md border px-2 py-2 text-left",
                          manutencao
                            ? "border-amber-500 bg-amber-100 text-amber-950"
                            : reserva
                            ? getCorReserva(reserva.id)
                            : "border-border bg-background",
                        ].join(" ")}
                      >
                        <p
                          className={[
                            "text-sm font-bold",
                            reserva || manutencao ? "" : "text-text",
                          ].join(" ")}
                        >
                          {horario}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold opacity-80">
                          {manutencao
                            ? `Manutenção - ${manutencao.reason}`
                            : reserva
                            ? `${reserva.project_name} - ${getNomeResponsavel(
                                reserva.profile_id,
                              )}`
                            : "Livre"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {reservasDaData.length > 0 ? (
                  <div className="mt-4 grid gap-2 border-t border-border pt-3">
                    {reservasDaData.map((reserva) => (
                      <div
                        key={reserva.id}
                        id={`reserva-${reserva.id}`}
                        className={[
                          "flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                          getCorReserva(reserva.id),
                          reserva.id === reservaDestacadaId ? "ring-2 ring-primary" : "",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {reserva.project_name}
                          </span>
                          <span className="block text-xs font-semibold opacity-80">
                            {formatarHorario(reserva.starts_at, timezone)} até{" "}
                            {formatarHorario(reserva.ends_at, timezone)} -{" "}
                            {reserva.material_id ? `${reserva.material?.name ?? "Material removido"} - ` : ""}
                            {getBookingStatusLabel(reserva.status)}
                          </span>
                          {reserva.status === "rejected" && reserva.rejected_reason ? (
                            <span className="block truncate text-xs font-semibold opacity-80">
                              Motivo: {reserva.rejected_reason}
                            </span>
                          ) : null}
                          <span className="block truncate text-xs font-semibold opacity-80">
                            {getNomeResponsavel(reserva.profile_id)}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                          {podeGerenciarReserva(reserva) && reservaPodeSerEditada(reserva) ? (
                            <button
                              type="button"
                              title="Editar reserva"
                              aria-label={`Editar reserva ${reserva.project_name}`}
                              onClick={() => abrirEdicao(reserva)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-current opacity-70 transition hover:bg-white/60 hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : null}
                          {podeGerenciarReserva(reserva) && reservaPodeSerCancelada(reserva) ? (
                            <button
                              type="button"
                              title="Cancelar reserva"
                              aria-label={`Cancelar reserva ${reserva.project_name}`}
                              onClick={() => setReservaParaCancelar(reserva)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-current opacity-70 transition hover:bg-white/60 hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {getManutencoesDaData(equipment.id).length > 0 ? (
                  <div className="mt-4 grid gap-2 border-t border-border pt-3">
                    {getManutencoesDaData(equipment.id).map((block) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-amber-950"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">Manutenção: {block.reason}</p>
                          <p className="text-xs font-semibold opacity-80">
                            {formatarHorario(block.starts_at, timezone)} até {formatarHorario(block.ends_at, timezone)}
                          </p>
                          {block.notes ? <p className="mt-1 text-xs">{block.notes}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {isCoordinator ? (
                  <BookingLifecycleActions
                    bookings={reservasDaData}
                    disabled={salvando}
                    onChangeStatus={alterarStatus}
                  />
                ) : null}
              </Card>
            );
          })}
        </section>
      ) : (
        <Card>
          <div className="flex items-center gap-3 text-muted">
            <Clock className="h-6 w-6" aria-hidden="true" />
            <p className="text-lg font-semibold">
              Cadastre pelo menos um equipamento para visualizar a agenda.
            </p>
          </div>
        </Card>
      )}

      {modalAberto ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-text/40 px-4 py-6 sm:items-center"
          role="dialog"
        >
          <Card className="max-h-[90vh] w-full max-w-5xl overflow-y-auto shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {reservaEmEdicao ? "Editar reserva" : "Criar reserva"}
                </h3>
                <p className="mt-1 text-lg text-muted">
                  Informe os dados e escolha um equipamento disponível.
                </p>
              </div>
              <button
                aria-label="Fechar reserva"
                className="self-start rounded-lg p-2 text-muted transition hover:bg-background hover:text-text"
                onClick={fecharModal}
                type="button"
              >
                <X aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>

            <form className="mt-5 grid gap-5" onSubmit={salvarReserva}>
              <div className="grid items-start gap-4 md:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
                <label className="grid gap-2 text-base font-semibold text-text">
                  Projeto
                  <select
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required
                    value={novaReserva.project_id}
                    onChange={(event) =>
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        project_id: event.target.value,
                        spool_id: "",
                      }))
                    }
                  >
                    <option value="" disabled>
                      {projetosDisponiveis.length > 0 ? "Selecione" : "Nenhum projeto disponível"}
                    </option>
                    {projetosDisponiveis.map((projeto) => (
                      <option key={projeto.id} value={projeto.id}>
                        {projeto.name}
                      </option>
                    ))}
                  </select>
                  {projetosDisponiveis.length === 0 ? (
                    <span className="text-sm font-normal text-muted">
                      Você ainda não participa de nenhum projeto em aberto. Peça a um coordenador para incluir você em um projeto.
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Material
                  <select
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required={usaMaterial}
                    value={novaReserva.material_id}
                    onChange={(event) => {
                      setErro("");
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        material_id: event.target.value,
                        spool_id: "",
                        equipment_id: "",
                      }));
                    }}
                  >
                    <option value="" disabled={usaMaterial || !equipamentoEscolhido}>
                      {equipamentoEscolhido && !usaMaterial ? "Não se aplica" : "Selecione"}
                    </option>
                    {materiaisAtivos.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm font-normal text-muted">
                    {equipamentoEscolhido && !usaMaterial
                      ? "Este equipamento não usa material."
                      : "Obrigatório para impressoras; escolha antes do equipamento."}
                  </span>
                </label>

                {novaReserva.material_id && novaReserva.project_id ? (
                  <label className="grid gap-2 text-base font-semibold text-text">
                    Item do estoque (opcional)
                    <select
                      className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                      value={novaReserva.spool_id}
                      onChange={(event) => setNovaReserva((reserva) => ({ ...reserva, spool_id: event.target.value }))}
                    >
                      <option value="">Sem item definido</option>
                      {rolosDisponiveis.map((rolo) => (
                        <option key={rolo.id} value={rolo.id}>
                          {getSpoolLabel(rolo)}
                          {rolo.project_id ? " (do projeto)" : " (estoque geral)"}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm font-normal text-muted">
                      {rolosDisponiveis.length > 0
                        ? "Só aparecem itens deste material, do projeto escolhido ou do estoque geral."
                        : "Nenhum item deste material disponível para o projeto; a reserva segue sem item."}
                    </span>
                  </label>
                ) : null}

                <label className="grid gap-2 text-base font-semibold text-text">
                  Data
                  <input
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required
                    type="date"
                    value={novaReserva.reservation_date}
                    onChange={(event) => {
                      const proximaData = event.target.value;
                      const horarioAtualIndisponivel = horarioJaPassou(
                        proximaData,
                        novaReserva.starts_at,
                      );

                      setErro("");
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        reservation_date: proximaData,
                        starts_at: horarioAtualIndisponivel
                          ? ""
                          : reserva.starts_at,
                        equipment_id: "",
                      }));
                    }}
                  />
                </label>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Inicio
                  <select
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required
                    value={novaReserva.starts_at}
                    onChange={(event) => {
                      setErro("");
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        starts_at: event.target.value,
                        equipment_id: "",
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {horariosReserva.map((horario) => {
                      const passou =
                        horarioJaPassou(novaReserva.reservation_date, horario) &&
                        horario !== getHorarioNoFuso(
                          new Date(reservaEmEdicao?.starts_at ?? 0),
                          timezone,
                        );

                      return (
                        <option key={horario} value={horario} disabled={passou}>
                          {passou ? `${horario} - indisponivel` : horario}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Tempo (h)
                  <input
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    min="0.5"
                    max="24"
                    step="0.5"
                    type="number"
                    required
                    value={novaReserva.duration_hours}
                    onChange={(event) => {
                      setErro("");
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        duration_hours: event.target.value,
                        equipment_id: "",
                      }));
                    }}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-base font-semibold text-text">
                Observações
                <textarea
                  className="min-h-20 rounded-lg border border-border bg-background px-4 py-3 text-base font-normal text-text outline-none transition focus:border-primary"
                  value={novaReserva.notes}
                  onChange={(event) => setNovaReserva((reserva) => ({ ...reserva, notes: event.target.value }))}
                  placeholder="Informações opcionais para a execução da impressão"
                />
              </label>

              {inicioSelecionado && fimSelecionado ? (
                <p
                  className={[
                    "rounded-lg border px-4 py-3 text-sm font-semibold",
                    horarioSelecionadoJaPassou()
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-border bg-background text-muted",
                  ].join(" ")}
                >
                  Janela solicitada:{" "}
                  {formatarDataHora(inicioSelecionado.toISOString(), timezone)} até{" "}
                  {formatarDataHora(fimSelecionado.toISOString(), timezone)}
                  {horarioSelecionadoJaPassou()
                    ? " - horario ja passou"
                    : ""}
                </p>
              ) : null}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <PrinterIcon
                    className="h-5 w-5 text-primary"
                    aria-hidden="true"
                  />
                  <h4 className="text-xl font-bold text-text">
                    Disponibilidade dos equipamentos
                  </h4>
                </div>

                {impressorasAtivas.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {impressorasAtivas.map((equipment) => {
                      const reservasDaImpressora =
                        reservasPorImpressora[equipment.id] ?? [];
                      const usaMaterialAqui = equipmentUsesMaterial(equipment);
                      const compativel = !usaMaterialAqui
                        ? true
                        : novaReserva.material_id
                          ? impressoraAceitaMaterial(
                              equipment.id,
                              novaReserva.material_id,
                            )
                          : false;
                      const conflito = getReservaConflitante(equipment.id);
                      const manutencao = getManutencaoConflitante(equipment.id);
                      const disponivel =
                        compativel &&
                        !conflito &&
                        !manutencao &&
                        horarioSelecionadoValido();
                      const selecionada = novaReserva.equipment_id === equipment.id;
                      const materiaisDaImpressora =
                        getMateriaisDaImpressora(equipment.id);

                      return (
                        <label
                          key={equipment.id}
                          className={[
                            "grid cursor-pointer gap-3 rounded-lg border p-4 transition",
                            selecionada
                              ? "border-primary bg-primary-soft"
                              : "border-border bg-surface",
                            disponivel
                              ? "hover:border-primary"
                              : "cursor-not-allowed opacity-65",
                          ].join(" ")}
                          onClick={() => selecionarImpressora(equipment)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-text">
                                {equipment.name}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-muted">
                                {equipment.model ?? "Modelo não informado"}
                              </p>
                            </div>
                            <input
                              checked={selecionada}
                              className="mt-1 h-5 w-5 accent-primary"
                              disabled={!disponivel}
                              name="equipment_id"
                              onChange={() => selecionarImpressora(equipment)}
                              type="radio"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <StatusBadge label="Disponível" variant="success" />
                            {equipment.type ? <StatusBadge label={equipment.type.name} variant="neutral" /> : null}
                            {usaMaterialAqui ? (
                              <StatusBadge
                                label={
                                  novaReserva.material_id
                                    ? compativel
                                      ? "Material ok"
                                      : "Material incompativel"
                                    : "Escolha material"
                                }
                                variant={compativel ? "info" : "neutral"}
                              />
                            ) : null}
                            {horarioSelecionadoJaPassou() ? (
                              <StatusBadge
                                label="Horario passado"
                                variant="danger"
                              />
                            ) : null}
                            <StatusBadge
                              label={manutencao ? "Em manutenção" : conflito ? "Horário ocupado" : "Horário livre"}
                              variant={conflito || manutencao ? "danger" : "success"}
                            />
                          </div>

                          {usaMaterialAqui ? (
                            <p className="line-clamp-2 text-xs font-semibold leading-5 text-muted">
                              Materiais:{" "}
                              {materiaisDaImpressora.length > 0
                                ? materiaisDaImpressora
                                    .map((material) => material.name)
                                    .join(", ")
                                : "Nenhum material compativel"}
                            </p>
                          ) : null}

                          <p className="text-sm font-semibold text-muted">
                            {manutencao
                              ? `Bloqueada até ${formatarDataHora(manutencao.ends_at, timezone)}`
                              : conflito
                              ? `Ocupada até ${formatarDataHora(
                                  conflito.ends_at,
                                  timezone,
                                )}`
                              : `${reservasDaImpressora.length} reserva(s) cadastrada(s)`}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">
                    Cadastre pelo menos um equipamento ativo antes de criar
                    reservas.
                  </p>
                )}
              </section>

              {erro ? (
                <p className="rounded-lg border border-danger bg-danger-soft p-3 text-lg font-semibold text-danger">
                  {erro}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={fecharModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="success"
                  disabled={!formularioReservaCompleto || salvando}
                >
                  {salvando ? "Salvando..." : reservaEmEdicao ? "Atualizar reserva" : "Salvar reserva"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {reservaParaCancelar ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 px-4 py-6"
          role="dialog"
        >
          <Card className="w-full max-w-md text-center shadow-soft">
            <div className="flex justify-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-danger-soft text-danger-dark">
                <Trash2 className="h-6 w-6" aria-hidden="true" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-text">
              Cancelar reserva?
            </h3>
            <p className="mt-2 text-base leading-6 text-muted">
              Tem certeza de que deseja cancelar{" "}
              {reservaParaCancelar.project_name}?
            </p>
            <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="ghost"
                onClick={() => setReservaParaCancelar(null)}
              >
                Voltar
              </Button>
              <Button
                variant="danger"
                disabled={salvando}
                onClick={() => cancelarReserva(reservaParaCancelar.id)}
              >
                Cancelar reserva
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {reservaParaRejeitar ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/40 px-4 py-6"
          role="dialog"
        >
          <Card className="w-full max-w-md shadow-soft">
            <h3 className="text-2xl font-bold text-text">Rejeitar reserva?</h3>
            <p className="mt-2 text-base leading-6 text-muted">
              A reserva {reservaParaRejeitar.project_name} será recusada e o
              horário liberado para outros pesquisadores.
            </p>
            <label className="mt-4 grid gap-2 text-base font-semibold text-text">
              Motivo (opcional)
              <input
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                value={motivoRejeicao}
                onChange={(event) => setMotivoRejeicao(event.target.value)}
                placeholder="Ex.: equipamento reservado para manutenção"
              />
            </label>
            {erro ? (
              <p className="mt-3 rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">
                {erro}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="ghost"
                onClick={() => setReservaParaRejeitar(null)}
              >
                Voltar
              </Button>
              <Button
                variant="danger"
                disabled={salvando}
                onClick={() => rejeitarReserva(reservaParaRejeitar.id, motivoRejeicao)}
              >
                Rejeitar reserva
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {usoPendente ? (
        <Modal
          title={usoPendente.status === "completed" ? "Concluir impressão" : "Registrar falha"}
          description={`${usoPendente.reserva.project_name}. Quanto foi usado? Isso é abatido do estoque.`}
          onClose={() => setUsoPendente(null)}
        >
          <div className="grid gap-4">
            <label className="grid gap-2 text-base font-semibold text-text">
              Quantidade usada ({spools.find((item) => item.id === usoPendente.reserva.spool_id)?.unit ?? "g"})
              <input
                autoFocus
                className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                inputMode="decimal"
                value={quantidadeUso}
                onChange={(event) => setQuantidadeUso(event.target.value)}
              />
              {(() => {
                const rolo = spools.find((item) => item.id === usoPendente.reserva.spool_id);
                return rolo ? (
                  <span className="text-sm font-normal text-muted">
                    Item: {getSpoolLabel(rolo)}. Restam {formatAmount(rolo.current_amount, rolo.unit)}.
                  </span>
                ) : null;
              })()}
            </label>
            {erro ? (
              <p className="rounded-lg border border-danger bg-danger-soft p-3 text-base font-semibold text-danger">{erro}</p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" disabled={salvando} onClick={() => confirmarUso(false)}>
                Concluir sem informar
              </Button>
              <Button disabled={salvando} onClick={() => confirmarUso(true)}>
                {salvando ? "Salvando..." : "Concluir e abater do estoque"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
