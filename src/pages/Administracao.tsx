import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";

const areas = ["Usuários", "Impressoras", "Materiais", "Manutenção"];

export function Administracao() {
  return (
    <div>
      <PageHeader
        title="Administração"
        description=""
        action={<Button fullWidth variant="secondary">Abrir painel</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2">
        {areas.map((area) => (
          <Card key={area}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-text">{area}</h3>
              </div>
              <StatusBadge label="Futuro" variant="neutral" />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
