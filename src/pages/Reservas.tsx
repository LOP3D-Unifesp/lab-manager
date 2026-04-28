import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";

const reservas = [
  { projeto: "Protótipo de órtese", horario: "09:00 - 11:30", status: "Aprovada" },
  { projeto: "Teste de material", horario: "14:00 - 16:00", status: "Pendente" },
  { projeto: "Peça anatômica", horario: "17:00 - 19:00", status: "Em andamento" },
];

export function Reservas() {
  return (
    <div>
      <PageHeader
        title="Reservas"
        description="Acompanhamento estático das reservas para validar navegação e componentes visuais."
        action={<Button fullWidth>Criar reserva</Button>}
      />

      <section className="space-y-4">
        {reservas.map((reserva) => (
          <Card key={reserva.projeto}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {reserva.projeto}
                </h3>
                <p className="mt-1 text-lg text-muted">{reserva.horario}</p>
              </div>
              <StatusBadge
                label={reserva.status}
                variant={
                  reserva.status === "Aprovada"
                    ? "success"
                    : reserva.status === "Pendente"
                      ? "warning"
                      : "info"
                }
              />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
