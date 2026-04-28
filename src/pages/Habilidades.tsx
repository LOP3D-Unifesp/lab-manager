import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";

const habilidades = [
  "Modelagem 3D",
  "Fatiamento",
  "Materiais flexíveis",
  "Pós-processamento",
  "Manutenção básica",
  "Digitalização 3D",
];

export function Habilidades() {
  return (
    <div>
      <PageHeader
        title="Habilidades"
        description="Área inicial para encontrar competências técnicas disponíveis entre pesquisadores."
        action={<Button fullWidth variant="primary">Buscar habilidade</Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {habilidades.map((habilidade, index) => (
          <Card key={habilidade}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-2xl font-bold text-text">{habilidade}</h3>
              <StatusBadge
                label={`${index + 2} pessoas`}
                variant={index % 2 === 0 ? "info" : "neutral"}
              />
            </div>
            <p className="mt-4 text-base leading-6 text-muted">
              Placeholder para futura associação entre perfis e competências.
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
