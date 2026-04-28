import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";

const impressoras = [
  { nome: "Prusa MK4", material: "PLA, PETG", status: "Ativa" },
  { nome: "Ender 3 S1", material: "PLA", status: "Em manutenção" },
  { nome: "Bambu Lab P1S", material: "PLA, ABS", status: "Ativa" },
];

export function Impressoras() {
  return (
    <div>
      <PageHeader
        title="Impressoras"
        description="Lista inicial de equipamentos, status operacional e materiais compatíveis demonstrativos."
        action={<Button fullWidth variant="success">Cadastrar impressora</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {impressoras.map((impressora) => (
          <Card key={impressora.nome}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {impressora.nome}
                </h3>
                <p className="mt-2 text-lg text-muted">
                  Materiais: {impressora.material}
                </p>
              </div>
              <StatusBadge
                label={impressora.status}
                variant={
                  impressora.status === "Ativa" ? "success" : "warning"
                }
              />
            </div>
            <p className="mt-4 text-base leading-6 text-muted">
              Este card ainda não possui agenda ou regras de disponibilidade.
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
