import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";

const periodos = [
  { horario: "08:00 - 12:00", pessoas: "4 pesquisadores", status: "Aberto" },
  { horario: "13:00 - 17:00", pessoas: "6 pesquisadores", status: "Movimento alto" },
  { horario: "18:00 - 21:00", pessoas: "2 pesquisadores", status: "Monitorar" },
];

export function AgendaLaboratorio() {
  return (
    <div>
      <PageHeader
        title="Agenda do Laboratório"
        description="Visualização placeholder de presença por período, preparada para evoluir para agenda completa."
        action={<Button fullWidth variant="secondary">Ver semana</Button>}
      />

      <section className="space-y-4">
        {periodos.map((periodo) => (
          <Card key={periodo.horario}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {periodo.horario}
                </h3>
                <p className="mt-1 text-lg text-muted">{periodo.pessoas}</p>
              </div>
              <StatusBadge
                label={periodo.status}
                variant={periodo.status === "Movimento alto" ? "warning" : "info"}
              />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
