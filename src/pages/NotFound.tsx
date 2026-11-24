import { t } from "../i18n";
import { Link } from "react-router-dom";

import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export function NotFound() {
  return (
    <div>
      <PageHeader
        title={t("notFound.title")}
        description={t("notFound.hint")}
      />

      <Card>
        <p className="text-lg leading-7 text-muted">
          {t("notFound.back")}
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-dark px-5 py-3 text-lg font-semibold text-white transition hover:bg-primary dark:bg-primary"
        >
          {t("notFound.goDashboard")}
        </Link>
      </Card>
    </div>
  );
}
