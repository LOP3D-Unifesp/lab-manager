import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { pesquisadores } from "../lib/pesquisadores";

export function Pesquisadores() {
  return (
    <div>
      <PageHeader
        title="Pesquisadores"
        description="Consulta inicial de pesquisadores, vinculos academicos e presenca planejada."
        action={
          <Button fullWidth variant="secondary">
            Adicionar placeholder
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pesquisadores.map((pesquisador) => (
          <Card key={pesquisador.nome}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-text">
                  {pesquisador.nome}
                </h3>
                <p className="mt-2 text-lg text-muted">
                  Vinculo: {pesquisador.vinculo}
                </p>
              </div>
              <StatusBadge
                label={pesquisador.status}
                variant={
                  pesquisador.status === "No laboratorio" ? "success" : "info"
                }
              />
            </div>
            <p className="mt-4 text-base leading-6 text-muted">
              Card demonstrativo para validar listas responsivas de pessoas.
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
