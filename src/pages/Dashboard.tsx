import { CalendarDays, ClipboardList, Printer, Users } from "lucide-react";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/StatusBadge";

export function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do laboratório para acompanhar presença, impressoras e reservas do dia."
        action={<Button fullWidth>Nova reserva</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pesquisadores hoje"
          value="8"
          description="Pessoas previstas no laboratório nesta data."
          icon={Users}
          status={{ label: "Presença prevista", variant: "info" }}
        />
        <StatCard
          title="Impressoras ativas"
          value="5"
          description="Equipamentos disponíveis para consulta inicial."
          icon={Printer}
          status={{ label: "Operação normal", variant: "success" }}
        />
        <StatCard
          title="Reservas do dia"
          value="12"
          description="Resumo estático para validar o layout."
          icon={ClipboardList}
          status={{ label: "Acompanhar agenda", variant: "warning" }}
        />
        <StatCard
          title="Próximos turnos"
          value="3"
          description="Janelas de laboratório destacadas como placeholder."
          icon={CalendarDays}
          status={{ label: "Em revisão", variant: "neutral" }}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-text">
                Agenda do laboratório
              </h3>
              <p className="mt-2 text-lg leading-7 text-muted">
                Espaço reservado para uma visão simplificada de presença e uso
                das impressoras.
              </p>
            </div>
            <StatusBadge label="Placeholder" variant="info" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Manhã", "Tarde", "Noite"].map((periodo) => (
              <div
                key={periodo}
                className="rounded-lg border border-border bg-background p-4"
              >
                <p className="text-lg font-bold text-text">{periodo}</p>
                <p className="mt-1 text-base text-muted">
                  Dados demonstrativos
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-2xl font-bold text-text">Alertas rápidos</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg text-text">Manutenção preventiva</span>
              <StatusBadge label="Atenção" variant="warning" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg text-text">Reservas pendentes</span>
              <StatusBadge label="Pendente" variant="neutral" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg text-text">Impressora Delta</span>
              <StatusBadge label="Ativa" variant="success" />
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
