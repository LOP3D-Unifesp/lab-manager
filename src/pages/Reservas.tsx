import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, Plus, Printer as PrinterIcon, Trash2, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import {
  calcularDuracaoMinutos,
  criarDataLocalSegura,
  getBookingStatusLabel,
  getPrinterStatusLabel,
  reservaBloqueiaHorario,
  reservaPodeSerCancelada,
  type Material,
  type Printer,
  type PrinterBooking,
  type PrinterMaterial,
  type Profile,
} from "../lib/domain";
import {
  cancelBooking,
  createBooking,
  listBookings,
  listMaterials,
  listPrinterMaterials,
  listPrinters,
  listProfiles,
} from "../lib/supabaseRepository";

const horariosReserva = Array.from({ length: 19 }, (_, index) => {
  const minutosTotais = 9 * 60 + index * 30;
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
});

const coresReserva = [
  "border-blue-400 bg-blue-100 text-blue-950",
  "border-rose-400 bg-rose-100 text-rose-950",
  "border-lime-500 bg-lime-100 text-lime-950",
  "border-indigo-400 bg-indigo-100 text-indigo-950",
  "border-amber-500 bg-amber-100 text-amber-950",
  "border-cyan-500 bg-cyan-100 text-cyan-950",
  "border-violet-400 bg-violet-100 text-violet-950",
  "border-orange-500 bg-orange-100 text-orange-950",
  "border-emerald-500 bg-emerald-100 text-emerald-950",
  "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-950",
];

function getDataLocalPadrao() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarDataHora(valor?: string) {
  if (!valor) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function formatarHorario(valor?: string) {
  if (!valor) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function intervalosSeCruzam(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && inicioB < fimA;
}

function getCorReserva(id: string, reservasDaData: PrinterBooking[]) {
  const index = reservasDaData.findIndex((reserva) => reserva.id === id);
  const fallback = id.split("").reduce((total, caractere) => {
    return total + caractere.charCodeAt(0);
  }, 0);

  return coresReserva[(index >= 0 ? index * 3 : fallback) % coresReserva.length];
}

function getMensagemErroReserva(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("booking_conflict")) {
    return "A impressora ja possui uma reserva nesse intervalo.";
  }

  if (message.includes("maintenance_conflict")) {
    return "A impressora esta em manutencao nesse intervalo.";
  }

  if (message.includes("incompatible_material")) {
    return "O material selecionado nao e compativel com a impressora.";
  }

  if (message.includes("printer_unavailable")) {
    return "A impressora selecionada nao esta ativa.";
  }

  if (message.includes("invalid_start_time")) {
    return "Escolha um horario futuro para a reserva.";
  }

  return message || "Nao foi possivel salvar a reserva.";
}

export function Reservas() {
  const { currentProfile } = useCurrentProfile();
  const [bookings, setBookings] = useState<PrinterBooking[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [printerMaterials, setPrinterMaterials] = useState<PrinterMaterial[]>(
    [],
  );
  const [dataAgenda, setDataAgenda] = useState(getDataLocalPadrao());
  const [modalAberto, setModalAberto] = useState(false);
  const [reservaParaCancelar, setReservaParaCancelar] =
    useState<PrinterBooking | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [novaReserva, setNovaReserva] = useState({
    project_name: "",
    material_id: "",
    duration_hours: "",
    reservation_date: "",
    starts_at: "",
    printer_id: "",
  });

  async function carregarDados() {
    const [
      bookingsData,
      printersData,
      profilesData,
      materialsData,
      printerMaterialsData,
    ] = await Promise.all([
      listBookings(),
      listPrinters(),
      listProfiles(),
      listMaterials(),
      listPrinterMaterials(),
    ]);

    setBookings(bookingsData);
    setPrinters(printersData);
    setProfiles(profilesData);
    setMaterials(materialsData);
    setPrinterMaterials(printerMaterialsData);
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

  const impressorasAtivas = useMemo(
    () => printers.filter((printer) => printer.status === "active"),
    [printers],
  );

  const materiaisAtivos = useMemo(
    () => materials.filter((material) => material.is_active),
    [materials],
  );

  const reservasPorImpressora = useMemo(() => {
    return bookings.reduce<Record<string, PrinterBooking[]>>(
      (mapa, reserva) => {
        mapa[reserva.printer_id] = [...(mapa[reserva.printer_id] ?? []), reserva];
        return mapa;
      },
      {},
    );
  }, [bookings]);

  const duracaoMinutos = calcularDuracaoMinutos(novaReserva.duration_hours);
  const inicioSelecionado =
    novaReserva.reservation_date && novaReserva.starts_at
      ? criarDataLocalSegura(novaReserva.reservation_date, novaReserva.starts_at)
      : null;
  const fimSelecionado =
    inicioSelecionado && duracaoMinutos
      ? new Date(inicioSelecionado.getTime() + duracaoMinutos * 60 * 1000)
      : null;

  const minhasReservasDaData = useMemo(() => {
    if (!currentProfile) {
      return [];
    }

    const inicioDia = criarDataLocalSegura(dataAgenda, "00:00");

    if (!inicioDia) {
      return [];
    }

    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    return bookings
      .filter((reserva) => {
        return (
          reserva.profile_id === currentProfile.id &&
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

  function impressoraAceitaMaterial(printerId: string, materialId: string) {
    return printerMaterials.some(
      (item) => item.printer_id === printerId && item.material_id === materialId,
    );
  }

  function getMateriaisDaImpressora(printerId: string) {
    const materialIds = new Set(
      printerMaterials
        .filter((item) => item.printer_id === printerId)
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

    const dataHorario = criarDataLocalSegura(data, horario);
    return !dataHorario || dataHorario.getTime() < Date.now();
  }

  function getReservaConflitante(printerId: string) {
    if (!inicioSelecionado || !fimSelecionado) {
      return null;
    }

    return (
      (reservasPorImpressora[printerId] ?? []).find((reserva) => {
        return (
          reservaBloqueiaHorario(reserva) &&
          intervalosSeCruzam(
            inicioSelecionado,
            fimSelecionado,
            new Date(reserva.starts_at),
            new Date(reserva.ends_at),
          )
        );
      }) ?? null
    );
  }

  function getReservaNoHorario(printerId: string, horario: string) {
    const inicioHorario = criarDataLocalSegura(dataAgenda, horario);

    if (!inicioHorario) {
      return null;
    }

    const fimHorario = new Date(inicioHorario.getTime() + 30 * 60 * 1000);

    return (
      (reservasPorImpressora[printerId] ?? []).find((reserva) => {
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

  function getReservasDaData(printerId: string) {
    const inicioDia = criarDataLocalSegura(dataAgenda, "00:00");

    if (!inicioDia) {
      return [];
    }

    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    return (reservasPorImpressora[printerId] ?? [])
      .filter((reserva) => {
        return intervalosSeCruzam(
          inicioDia,
          fimDia,
          new Date(reserva.starts_at),
          new Date(reserva.ends_at),
        );
      })
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
  }

  function getNomeResponsavel(profileId?: string) {
    if (!profileId) {
      return "Sem usuario";
    }

    return (
      profiles.find((profile) => profile.id === profileId)?.full_name ??
      "Usuario removido"
    );
  }

  function abrirModal() {
    if (!currentProfile) {
      setErro("Entre com um perfil ativo antes de criar uma reserva.");
      return;
    }

    if (impressorasAtivas.length === 0) {
      setErro("Cadastre pelo menos uma impressora ativa antes de reservar.");
      return;
    }

    if (materiaisAtivos.length === 0) {
      setErro("Cadastre pelo menos um material antes de reservar.");
      return;
    }

    if (printerMaterials.length === 0) {
      setErro("Cadastre compatibilidades entre impressoras e materiais.");
      return;
    }

    setErro("");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setErro("");
    setNovaReserva({
      project_name: "",
      material_id: "",
      duration_hours: "",
      reservation_date: "",
      starts_at: "",
      printer_id: "",
    });
  }

  function selecionarImpressora(printer: Printer) {
    if (!novaReserva.material_id) {
      setErro("Selecione um material antes de escolher a impressora.");
      return;
    }

    if (!impressoraAceitaMaterial(printer.id, novaReserva.material_id)) {
      setErro("Esta impressora nao suporta o material selecionado.");
      return;
    }

    if (horarioSelecionadoJaPassou()) {
      setErro("Nao e possivel selecionar um horario que ja passou.");
      return;
    }

    if (getReservaConflitante(printer.id)) {
      setErro("A impressora selecionada nao esta livre nesse horario.");
      return;
    }

    setErro("");
    setNovaReserva((reserva) => ({ ...reserva, printer_id: printer.id }));
  }

  async function salvarReserva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const projectName = novaReserva.project_name.trim();

    if (
      !projectName ||
      !novaReserva.material_id ||
      !novaReserva.reservation_date ||
      !novaReserva.starts_at ||
      !novaReserva.printer_id ||
      !inicioSelecionado ||
      !fimSelecionado ||
      !duracaoMinutos
    ) {
      setErro(
        "Preencha nome, material, data, horario e duracao entre 0,5h e 24h em passos de 0,5h.",
      );
      return;
    }

    if (horarioSelecionadoJaPassou()) {
      setErro("Nao e possivel reservar um horario que ja passou.");
      return;
    }

    if (!impressoraAceitaMaterial(novaReserva.printer_id, novaReserva.material_id)) {
      setErro("Selecione uma impressora compativel com o material.");
      return;
    }

    try {
      setSalvando(true);
      await createBooking({
        printerId: novaReserva.printer_id,
        materialId: novaReserva.material_id,
        projectName,
        startsAt: inicioSelecionado.toISOString(),
        durationMinutes: duracaoMinutos,
      });
      setDataAgenda(novaReserva.reservation_date);
      await carregarDados();
      fecharModal();
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

  const formularioReservaCompleto =
    novaReserva.project_name.trim().length > 0 &&
    novaReserva.material_id.length > 0 &&
    novaReserva.reservation_date.length > 0 &&
    novaReserva.starts_at.length > 0 &&
    novaReserva.printer_id.length > 0 &&
    Boolean(duracaoMinutos) &&
    !horarioSelecionadoJaPassou();

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Reservas gravadas no Supabase com validacao transacional no banco."
        action={
          <Button fullWidth onClick={abrirModal}>
            <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
            Criar reserva
          </Button>
        }
      />

      <section className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-text">Agenda por impressora</h3>
          <p className="mt-1 text-base text-muted">
            Horarios de reserva das 09:00 ate 18:00, separados por equipamento.
          </p>
        </div>
        <label className="grid gap-2 text-base font-semibold text-text sm:w-56">
          Data
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
            type="date"
            value={dataAgenda}
            onChange={(event) => setDataAgenda(event.target.value)}
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
                Impressoes associadas ao usuario atual nesta data.
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
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-text">
                      {reserva.project_name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-muted">
                      {formatarHorario(reserva.starts_at)} ate{" "}
                      {formatarHorario(reserva.ends_at)} -{" "}
                      {reserva.printer?.name ?? "Impressora removida"} -{" "}
                      {reserva.material?.name ?? "Material removido"}
                    </p>
                  </div>
                  {reservaPodeSerCancelada(reserva) ? (
                    <button
                      type="button"
                      title="Cancelar reserva"
                      aria-label={`Cancelar reserva ${reserva.project_name}`}
                      onClick={() => setReservaParaCancelar(reserva)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {printers.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {printers.map((printer) => {
            const reservasDaData = getReservasDaData(printer.id);
            const materiaisDaImpressora = getMateriaisDaImpressora(printer.id);

            return (
              <Card key={printer.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-text">
                      {printer.name}
                    </h3>
                    <p className="mt-1 text-base font-semibold text-muted">
                      {printer.model ?? "Modelo nao informado"}
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
                  <StatusBadge
                    label={getPrinterStatusLabel(printer.status)}
                    variant={printer.status === "active" ? "success" : "warning"}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {horariosReserva.map((horario) => {
                    const reserva = getReservaNoHorario(printer.id, horario);

                    return (
                      <div
                        key={horario}
                        className={[
                          "min-h-16 rounded-md border px-2 py-2 text-left",
                          reserva
                            ? getCorReserva(reserva.id, reservasDaData)
                            : "border-border bg-background",
                        ].join(" ")}
                      >
                        <p
                          className={[
                            "text-sm font-bold",
                            reserva ? "" : "text-text",
                          ].join(" ")}
                        >
                          {horario}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold opacity-80">
                          {reserva
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
                        className={[
                          "flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                          getCorReserva(reserva.id, reservasDaData),
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {reserva.project_name}
                          </span>
                          <span className="block text-xs font-semibold opacity-80">
                            {formatarHorario(reserva.starts_at)} ate{" "}
                            {formatarHorario(reserva.ends_at)} -{" "}
                            {reserva.material?.name ?? "Material removido"} -{" "}
                            {getBookingStatusLabel(reserva.status)}
                          </span>
                          <span className="block truncate text-xs font-semibold opacity-80">
                            {getNomeResponsavel(reserva.profile_id)}
                          </span>
                        </div>
                        {currentProfile?.id === reserva.profile_id &&
                        reservaPodeSerCancelada(reserva) ? (
                          <button
                            type="button"
                            title="Cancelar reserva"
                            aria-label={`Cancelar reserva ${reserva.project_name}`}
                            onClick={() => setReservaParaCancelar(reserva)}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-md text-current opacity-70 transition hover:bg-white/60 hover:opacity-100 sm:self-center"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
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
              Cadastre pelo menos uma impressora para visualizar a agenda.
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
                <h3 className="text-2xl font-bold text-text">Criar reserva</h3>
                <p className="mt-1 text-lg text-muted">
                  Informe os dados e escolha uma impressora compativel.
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
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
                <label className="grid gap-2 text-base font-semibold text-text">
                  Nome da impressao
                  <input
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required
                    value={novaReserva.project_name}
                    onChange={(event) =>
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        project_name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Material
                  <select
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required
                    value={novaReserva.material_id}
                    onChange={(event) => {
                      setErro("");
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        material_id: event.target.value,
                        printer_id: "",
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {materiaisAtivos.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                </label>

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
                        printer_id: "",
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
                        printer_id: "",
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {horariosReserva.map((horario) => {
                      const passou = horarioJaPassou(
                        novaReserva.reservation_date,
                        horario,
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
                        printer_id: "",
                      }));
                    }}
                  />
                </label>
              </div>

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
                  {formatarDataHora(inicioSelecionado.toISOString())} ate{" "}
                  {formatarDataHora(fimSelecionado.toISOString())}
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
                    Disponibilidade das impressoras
                  </h4>
                </div>

                {impressorasAtivas.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {impressorasAtivas.map((printer) => {
                      const reservasDaImpressora =
                        reservasPorImpressora[printer.id] ?? [];
                      const compativel = novaReserva.material_id
                        ? impressoraAceitaMaterial(
                            printer.id,
                            novaReserva.material_id,
                          )
                        : false;
                      const conflito = getReservaConflitante(printer.id);
                      const disponivel =
                        compativel &&
                        !conflito &&
                        !horarioSelecionadoJaPassou();
                      const selecionada = novaReserva.printer_id === printer.id;
                      const materiaisDaImpressora =
                        getMateriaisDaImpressora(printer.id);

                      return (
                        <label
                          key={printer.id}
                          className={[
                            "grid cursor-pointer gap-3 rounded-lg border p-4 transition",
                            selecionada
                              ? "border-primary bg-primary-soft"
                              : "border-border bg-surface",
                            disponivel
                              ? "hover:border-primary"
                              : "cursor-not-allowed opacity-65",
                          ].join(" ")}
                          onClick={() => selecionarImpressora(printer)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-text">
                                {printer.name}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-muted">
                                {printer.model ?? "Modelo nao informado"}
                              </p>
                            </div>
                            <input
                              checked={selecionada}
                              className="mt-1 h-5 w-5 accent-primary"
                              disabled={!disponivel}
                              name="printer_id"
                              onChange={() => selecionarImpressora(printer)}
                              type="radio"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <StatusBadge label="Disponivel" variant="success" />
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
                            {horarioSelecionadoJaPassou() ? (
                              <StatusBadge
                                label="Horario passado"
                                variant="danger"
                              />
                            ) : null}
                            <StatusBadge
                              label={conflito ? "Horario ocupado" : "Horario livre"}
                              variant={conflito ? "danger" : "success"}
                            />
                          </div>

                          <p className="line-clamp-2 text-xs font-semibold leading-5 text-muted">
                            Materiais:{" "}
                            {materiaisDaImpressora.length > 0
                              ? materiaisDaImpressora
                                  .map((material) => material.name)
                                  .join(", ")
                              : "Nenhum material compativel"}
                          </p>

                          <p className="text-sm font-semibold text-muted">
                            {conflito
                              ? `Ocupada ate ${formatarDataHora(
                                  conflito.ends_at,
                                )}`
                              : `${reservasDaImpressora.length} reserva(s) cadastrada(s)`}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">
                    Cadastre pelo menos uma impressora ativa antes de criar
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
                  {salvando ? "Salvando..." : "Salvar reserva"}
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
    </div>
  );
}
