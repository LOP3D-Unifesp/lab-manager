import { account } from "./messages/account";
import { common } from "./messages/common";
import { dashboard } from "./messages/dashboard";
import { domain } from "./messages/domain";
import { labels } from "./messages/labels";
import { reservas } from "./messages/reservas";
import { nav } from "./messages/nav";

export type Entry = { pt: string; en: string; es: string };

// Cada chave traz as três traduções lado a lado: faltar um idioma vira erro de tipo.
const catalog = { ...common, ...nav, ...account, ...dashboard, ...domain, ...labels, ...reservas } satisfies Record<string, Entry>;

export type MessageKey = keyof typeof catalog;

function pick(locale: keyof Entry): Record<MessageKey, string> {
  return Object.fromEntries(
    Object.entries(catalog).map(([key, entry]) => [key, (entry as Entry)[locale]]),
  ) as Record<MessageKey, string>;
}

export const dictionaries = {
  "pt-BR": pick("pt"),
  en: pick("en"),
  es: pick("es"),
};
