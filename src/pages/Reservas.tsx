import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, Plus, Printer, Trash2, X } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useCurrentProfile } from "../lib/currentUser";
import {
  carregarLocalDatabase,
  criarLocalPrintReservation,
  observarLocalDatabase,
  salvarLocalDatabase,
  type LocalProfile,
  type LocalPrintReservation,
  type LocalPrinter,
} from "../lib/localDatabase";

const materiaisPadrao = ["PLA", "PETG", "ABS", "TPU", "PA", "Resina"];
const horariosReserva = Array.from({ length: 19 }, (_, index) => {
  const minutosTotais = 9 * 60 + index * 30;
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
});

function getDataLocalPadrao() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function criarDataLocal(data: string, horario: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);

  return new Date(ano, mes - 1, dia, hora, minuto);
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

function getMapaCoresReservas(reservas: LocalPrintReservation[]) {
  return reservas.reduce<Record<string, string>>((mapa, reserva, index) => {
    const indiceDistante = (index * 3) % coresReserva.length;

    mapa[reserva.id] = coresReserva[indiceDistante];
    return mapa;
  }, {});
}

function getCorReserva(id: string, mapaCores?: Record<string, string>) {
  if (mapaCores?.[id]) {
    return mapaCores[id];
  }

  const soma = id.split("").reduce((total, caractere) => {
    return total + caractere.charCodeAt(0);
  }, 0);

  return coresReserva[soma % coresReserva.length];
}

function intervalosSeCruzam(
  inicioA: Date,
  fimA: Date,
  inicioB: Date,
  fimB: Date,
) {
  return inicioA < fimB && inicioB < fimA;
}

export function Reservas() {
  const { currentProfile } = useCurrentProfile();
  const [reservas, setReservas] = useState<LocalPrintReservation[]>([]);
  const [impressoras, setImpressoras] = useState<LocalPrinter[]>([]);
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [dataAgenda, setDataAgenda] = useState(getDataLocalPadrao());
  const [modalAberto, setModalAberto] = useState(false);
  const [reservaParaExcluir, setReservaParaExcluir] =
    useState<LocalPrintReservation | null>(null);
  const [erro, setErro] = useState("");
  const [novaReserva, setNovaReserva] = useState({
    print_name: "",
    material: "",
    duration_hours: "",
    reservation_date: "",
    starts_at: "",
    printer_id: "",
  });

  useEffect(() => {
    let ativo = true;

    const atualizarReservas = async () => {
      const database = await carregarLocalDatabase();

      if (ativo) {
        setImpressoras(database.printers);
        setProfiles(database.profiles);
        setReservas(database.print_reservations);
      }
    };

    atualizarReservas();
    const pararObservacao = observarLocalDatabase(atualizarReservas);

    return () => {
      ativo = false;
      pararObservacao();
    };
  }, []);

  const materiaisDisponiveis = useMemo(() => {
    const materiaisDasImpressoras = impressoras.flatMap(
      (impressora) => impressora.allowed_filaments,
    );

    return Array.from(new Set([...materiaisPadrao, ...materiaisDasImpressoras]));
  }, [impressoras]);
  const impressoraSelecionadaAtual = impressoras.find(
    (impressora) => impressora.id === novaReserva.printer_id,
  );

  const reservasPorImpressora = useMemo(() => {
    return reservas.reduce<Record<string, LocalPrintReservation[]>>(
      (mapa, reserva) => {
        mapa[reserva.printer_id] = [...(mapa[reserva.printer_id] ?? []), reserva];
        return mapa;
      },
      {},
    );
  }, [reservas]);
  const minhasReservasDaData = useMemo(() => {
    if (!currentProfile) {
      return [];
    }

    const inicioDia = criarDataLocal(dataAgenda, "00:00");
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    return reservas
      .filter((reserva) => {
        if (
          reserva.profile_id !== currentProfile.id ||
          !reserva.scheduled_start_at ||
          !reserva.scheduled_end_at
        ) {
          return false;
        }

        return intervalosSeCruzam(
          inicioDia,
          fimDia,
          new Date(reserva.scheduled_start_at),
          new Date(reserva.scheduled_end_at),
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_start_at ?? "").getTime() -
          new Date(b.scheduled_start_at ?? "").getTime(),
      );
  }, [currentProfile, dataAgenda, reservas]);

  function abrirModal() {
    setErro("");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setErro("");
    setNovaReserva({
      print_name: "",
      material: "",
      duration_hours: "",
      reservation_date: "",
      starts_at: "",
      printer_id: "",
    });
  }

  const duracaoMinutos = Number(novaReserva.duration_hours) * 60;
  const inicioSelecionado =
    novaReserva.reservation_date && novaReserva.starts_at
      ? criarDataLocal(novaReserva.reservation_date, novaReserva.starts_at)
      : null;
  const fimSelecionado =
    inicioSelecionado && duracaoMinutos > 0
      ? new Date(inicioSelecionado.getTime() + duracaoMinutos * 60 * 1000)
      : null;

  function impressoraAceitaMaterial(impressora: LocalPrinter) {
    return impressora.allowed_filaments.includes(novaReserva.material);
  }

  function impressoraLivreParaHorario(impressora: LocalPrinter) {
    return impressora.status === "Ativa" && !getReservaConflitante(impressora.id);
  }

  function horarioSelecionadoJaPassou() {
    if (!inicioSelecionado) {
      return false;
    }

    return inicioSelecionado.getTime() < Date.now();
  }

  function horarioJaPassou(data: string, horario: string) {
    if (!data) {
      return false;
    }

    return criarDataLocal(data, horario).getTime() < Date.now();
  }

  function impressoraDisponivel(impressora: LocalPrinter) {
    return (
      impressoraLivreParaHorario(impressora) &&
      impressora.allowed_filaments.length > 0 &&
      impressoraAceitaMaterial(impressora) &&
      !horarioSelecionadoJaPassou()
    );
  }

  function selecionarImpressora(impressora: LocalPrinter) {
    if (!novaReserva.material) {
      setErro("Selecione um material antes de escolher a impressora.");
      return;
    }

    if (!impressoraAceitaMaterial(impressora)) {
      setErro("Esta impressora nao suporta o material selecionado.");
      return;
    }

    if (horarioSelecionadoJaPassou()) {
      setErro("Nao e possivel selecionar um horario que ja passou.");
      return;
    }

    if (!impressoraDisponivel(impressora)) {
      return;
    }

    setErro("");
    setNovaReserva((reserva) => ({
      ...reserva,
      printer_id: impressora.id,
    }));
  }

  function getReservaConflitante(printerId: string) {
    if (!inicioSelecionado || !fimSelecionado) {
      return null;
    }

    return (
      (reservasPorImpressora[printerId] ?? []).find((reserva) => {
        if (
          !reserva.scheduled_start_at ||
          !reserva.scheduled_end_at ||
          reserva.status === "Concluida"
        ) {
          return false;
        }

        return intervalosSeCruzam(
          inicioSelecionado,
          fimSelecionado,
          new Date(reserva.scheduled_start_at),
          new Date(reserva.scheduled_end_at),
        );
      }) ?? null
    );
  }

  function getReservaNoHorario(printerId: string, horario: string) {
    const inicioHorario = criarDataLocal(dataAgenda, horario);
    const fimHorario = new Date(inicioHorario.getTime() + 30 * 60 * 1000);

    return (
      (reservasPorImpressora[printerId] ?? []).find((reserva) => {
        if (
          !reserva.scheduled_start_at ||
          !reserva.scheduled_end_at ||
          reserva.status === "Concluida"
        ) {
          return false;
        }

        return intervalosSeCruzam(
          inicioHorario,
          fimHorario,
          new Date(reserva.scheduled_start_at),
          new Date(reserva.scheduled_end_at),
        );
      }) ?? null
    );
  }

  function getReservasDaData(printerId: string) {
    const inicioDia = criarDataLocal(dataAgenda, "00:00");
    const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    return (reservasPorImpressora[printerId] ?? [])
      .filter((reserva) => {
        if (!reserva.scheduled_start_at || !reserva.scheduled_end_at) {
          return false;
        }

        return intervalosSeCruzam(
          inicioDia,
          fimDia,
          new Date(reserva.scheduled_start_at),
          new Date(reserva.scheduled_end_at),
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_start_at ?? "").getTime() -
          new Date(b.scheduled_start_at ?? "").getTime(),
      );
  }

  async function salvarReserva(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const printName = novaReserva.print_name.trim();
    const impressoraSelecionada = impressoras.find(
      (impressora) => impressora.id === novaReserva.printer_id,
    );
    const materialDaReserva =
      impressoraSelecionada?.allowed_filaments.includes(novaReserva.material)
        ? novaReserva.material
        : "";

    if (
      !printName ||
      !novaReserva.material ||
      !novaReserva.reservation_date ||
      !novaReserva.starts_at ||
      !fimSelecionado ||
      !inicioSelecionado ||
      duracaoMinutos <= 0
    ) {
      setErro("Preencha nome, material, data, horario e tempo estimado.");
      return;
    }

    if (!impressoraSelecionada) {
      setErro("Selecione uma impressora disponivel para esta reserva.");
      return;
    }

    if (horarioSelecionadoJaPassou()) {
      setErro("Nao e possivel reservar um horario que ja passou.");
      return;
    }

    if (!impressoraDisponivel(impressoraSelecionada)) {
      setErro("A impressora selecionada nao esta livre nesse horario.");
      return;
    }

    if (!materialDaReserva) {
      if (impressoraSelecionada.allowed_filaments.length === 0) {
        setErro("A impressora selecionada nao tem materiais cadastrados.");
        return;
      }

      setErro("Selecione um material compativel com a impressora escolhida.");
      return;
    }

    if (impressoraSelecionada.allowed_filaments.length === 0) {
      setErro("A impressora selecionada nao tem materiais cadastrados.");
      return;
    }

    const database = await carregarLocalDatabase();
    const reserva = criarLocalPrintReservation({
      printer_id: impressoraSelecionada.id,
      profile_id: currentProfile?.id,
      print_name: printName,
      material: materialDaReserva,
      estimated_time: `${novaReserva.duration_hours}h`,
      duration_minutes: duracaoMinutos,
      reservation_date: novaReserva.reservation_date,
      starts_at: novaReserva.starts_at,
      scheduled_start_at: inicioSelecionado.toISOString(),
      scheduled_end_at: fimSelecionado.toISOString(),
    });

    await salvarLocalDatabase({
      ...database,
      print_reservations: [...database.print_reservations, reserva],
    });
    setReservas((listaAtual) => [...listaAtual, reserva]);
    setDataAgenda(novaReserva.reservation_date);
    fecharModal();
  }

  async function excluirMinhaReserva(reservaId: string) {
    const reserva = reservas.find((item) => item.id === reservaId);

    if (!reserva) {
      return;
    }

    const database = await carregarLocalDatabase();

    await salvarLocalDatabase({
      ...database,
      print_reservations: database.print_reservations.filter(
        (item) => item.id !== reservaId,
      ),
    });
    setReservas((listaAtual) =>
      listaAtual.filter((item) => item.id !== reservaId),
    );
    setReservaParaExcluir(null);
  }

  function reservaPertenceAoUsuarioAtual(reserva: LocalPrintReservation) {
    return Boolean(currentProfile && reserva.profile_id === currentProfile.id);
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

  const formularioReservaCompleto =
    novaReserva.print_name.trim().length > 0 &&
    novaReserva.material.length > 0 &&
    novaReserva.reservation_date.length > 0 &&
    novaReserva.starts_at.length > 0 &&
    duracaoMinutos > 0 &&
    !horarioSelecionadoJaPassou() &&
    Boolean(impressoraSelecionadaAtual) &&
    Boolean(
      impressoraSelecionadaAtual?.allowed_filaments.includes(
        novaReserva.material,
      ),
    ) &&
    Boolean(
      impressoraSelecionadaAtual &&
        impressoraDisponivel(impressoraSelecionadaAtual),
    );

  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Reservas de impressao com material, tempo estimado e disponibilidade das impressoras cadastradas."
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
              {minhasReservasDaData.map((reserva) => {
                const impressora = impressoras.find(
                  (item) => item.id === reserva.printer_id,
                );

                return (
                  <div
                    key={reserva.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-text">
                        {reserva.print_name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {formatarHorario(reserva.scheduled_start_at)} ate{" "}
                        {formatarHorario(reserva.scheduled_end_at)} -{" "}
                        {impressora?.name ?? "Impressora removida"} -{" "}
                        {reserva.material}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Excluir reserva"
                      aria-label={`Excluir reserva ${reserva.print_name}`}
                      onClick={() => setReservaParaExcluir(reserva)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger-soft hover:text-danger-dark"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {impressoras.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {impressoras.map((impressora) => {
            const reservasDaData = getReservasDaData(impressora.id);
            const mapaCoresReservas = getMapaCoresReservas(reservasDaData);

            return (
              <Card key={impressora.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-text">
                      {impressora.name}
                    </h3>
                    <p className="mt-1 text-base font-semibold text-muted">
                      {impressora.brand} - {impressora.model}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted">
                      Materiais:{" "}
                      {impressora.allowed_filaments.length > 0
                        ? impressora.allowed_filaments.join(", ")
                        : "Nenhum material cadastrado"}
                    </p>
                  </div>
                  <StatusBadge
                    label={impressora.status === "Ativa" ? "Ativa" : impressora.status}
                    variant={impressora.status === "Ativa" ? "success" : "warning"}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {horariosReserva.map((horario) => {
                    const reserva = getReservaNoHorario(impressora.id, horario);

                    return (
                      <div
                        key={horario}
                        className={[
                          "min-h-16 rounded-md border px-2 py-2 text-left",
                          reserva
                            ? getCorReserva(reserva.id, mapaCoresReservas)
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
                            ? `${reserva.print_name} - ${getNomeResponsavel(
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
                          getCorReserva(reserva.id, mapaCoresReservas),
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {reserva.print_name}
                          </span>
                          <span className="block text-xs font-semibold opacity-80">
                            {formatarHorario(reserva.scheduled_start_at)} ate{" "}
                            {formatarHorario(reserva.scheduled_end_at)} -{" "}
                            {reserva.material}
                          </span>
                          <span className="block truncate text-xs font-semibold opacity-80">
                            {getNomeResponsavel(reserva.profile_id)}
                          </span>
                        </div>
                        {reservaPertenceAoUsuarioAtual(reserva) ? (
                          <button
                            type="button"
                            title="Excluir reserva"
                            aria-label={`Excluir reserva ${reserva.print_name}`}
                            onClick={() => setReservaParaExcluir(reserva)}
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
                  Informe os dados da impressao e selecione uma impressora
                  compativel.
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
                    value={novaReserva.print_name}
                    onChange={(event) =>
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        print_name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="grid gap-2 text-base font-semibold text-text">
                  Material
                  <select
                    className="min-h-11 rounded-lg border border-border bg-background px-4 text-base font-normal text-text outline-none transition focus:border-primary"
                    required
                    value={novaReserva.material}
                    onChange={(event) => {
                      setErro("");
                      setNovaReserva((reserva) => ({
                        ...reserva,
                        material: event.target.value,
                        printer_id: "",
                      }));
                    }}
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {materiaisDisponiveis.map((material) => (
                      <option key={material}>{material}</option>
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
                        starts_at: horarioAtualIndisponivel ? "" : reserva.starts_at,
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
                        <option key={horario} disabled={passou}>
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
                  Janela solicitada: {formatarDataHora(inicioSelecionado.toISOString())} ate{" "}
                  {formatarDataHora(fimSelecionado.toISOString())}
                  {horarioSelecionadoJaPassou()
                    ? " - horario ja passou"
                    : ""}
                </p>
              ) : null}

              <section>
                <div className="mb-3 flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h4 className="text-xl font-bold text-text">
                    Disponibilidade das impressoras
                  </h4>
                </div>

                {impressoras.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {impressoras.map((impressora) => {
                      const reservasDaImpressora =
                        reservasPorImpressora[impressora.id] ?? [];
                      const ativa = impressora.status === "Ativa";
                      const compativel = impressoraAceitaMaterial(impressora);
                      const disponivel =
                        impressoraLivreParaHorario(impressora) &&
                        impressora.allowed_filaments.length > 0 &&
                        compativel &&
                        !horarioSelecionadoJaPassou();
                      const selecionada =
                        novaReserva.printer_id === impressora.id;
                      const conflito = getReservaConflitante(impressora.id);

                      return (
                        <label
                          key={impressora.id}
                          className={[
                            "grid cursor-pointer gap-3 rounded-lg border p-4 transition",
                            selecionada
                              ? "border-primary bg-primary-soft"
                              : "border-border bg-surface",
                            disponivel
                              ? "hover:border-primary"
                              : "cursor-not-allowed opacity-65",
                          ].join(" ")}
                          onClick={() => selecionarImpressora(impressora)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-text">
                                {impressora.name}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-muted">
                                {impressora.brand} - {impressora.model}
                              </p>
                            </div>
                            <input
                              checked={selecionada}
                              className="mt-1 h-5 w-5 accent-primary"
                              disabled={!disponivel}
                              name="printer_id"
                              onChange={() => selecionarImpressora(impressora)}
                              type="radio"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={ativa ? "Disponivel" : impressora.status}
                              variant={ativa ? "success" : "warning"}
                            />
                            <StatusBadge
                              label={
                                novaReserva.material
                                  ? compativel
                                    ? "Material ok"
                                    : "Material incompativel"
                                  : "Escolha material"
                              }
                              variant={compativel ? "info" : "neutral"}
                            />
                            {horarioSelecionadoJaPassou() ? (
                              <StatusBadge label="Horario passado" variant="danger" />
                            ) : null}
                            <StatusBadge
                              label={conflito ? "Horario ocupado" : "Horario livre"}
                              variant={conflito ? "danger" : "success"}
                            />
                          </div>

                          <p className="line-clamp-2 text-xs font-semibold leading-5 text-muted">
                            Materiais:{" "}
                            {impressora.allowed_filaments.length > 0
                              ? impressora.allowed_filaments.join(", ")
                              : "Nenhum material cadastrado"}
                          </p>

                          <p className="text-sm font-semibold text-muted">
                            {conflito
                              ? `Ocupada ate ${formatarDataHora(
                                  conflito.scheduled_end_at,
                                )}`
                              : `${reservasDaImpressora.length} reserva(s) cadastrada(s)`}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">
                    Cadastre pelo menos uma impressora antes de criar reservas.
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
                  disabled={!formularioReservaCompleto}
                >
                  Salvar reserva
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {reservaParaExcluir ? (
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
              Excluir reserva?
            </h3>
            <p className="mt-2 text-base leading-6 text-muted">
              Tem certeza de que deseja excluir {reservaParaExcluir.print_name}?
            </p>
            <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="ghost"
                onClick={() => setReservaParaExcluir(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => excluirMinhaReserva(reservaParaExcluir.id)}
              >
                Excluir reserva
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
