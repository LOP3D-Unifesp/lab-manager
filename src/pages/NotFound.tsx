import { Link } from "react-router-dom";

import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export function NotFound() {
  return (
    <div>
      <PageHeader
        title="Página não encontrada"
        description="O endereço acessado não corresponde a uma área disponível no Lab Manager."
      />

      <Card>
        <p className="text-lg leading-7 text-muted">
          Volte para o dashboard ou escolha uma seção pela navegação principal.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-dark px-5 py-3 text-lg font-semibold text-white transition hover:bg-primary"
        >
          Ir para o dashboard
        </Link>
      </Card>
    </div>
  );
}
