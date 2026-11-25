import { Link } from "react-router-dom";

import { useT } from "../../i18n";
import { getPurchaseStatusLabel, getPurchaseStatusVariant, type PurchaseRequest } from "../../lib/purchases";
import { StatusBadge } from "../ui/StatusBadge";
import { HomeCard, HomeEmpty } from "./HomeCard";

export function MyPurchasesCard({ purchases }: { purchases: PurchaseRequest[] }) {
  const t = useT();

  return (
    <HomeCard title={t("home.myPurchases")} to="/compras">
      {purchases.length === 0 ? (
        <HomeEmpty>{t("home.noPurchases")}</HomeEmpty>
      ) : (
        <ul className="grid gap-2">
          {purchases.map((purchase) => (
            <li key={purchase.id}>
              <Link to="/compras" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background p-3 transition hover:border-primary">
                <p className="min-w-0 break-words text-base font-bold text-text">{purchase.item}</p>
                <StatusBadge label={getPurchaseStatusLabel(purchase.status)} variant={getPurchaseStatusVariant(purchase.status)} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </HomeCard>
  );
}
