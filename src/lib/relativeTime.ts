const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

// "há 2 h", "2 hours ago", "hace 2 h". Passa de 7 dias, devolve texto vazio para quem chama mostrar a data.
export function formatRelativeTime(value: string | number | Date, locale: string, now: number = Date.now()): string {
  const diff = new Date(value).getTime() - now;
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });

  if (abs < 60_000) return formatter.format(0, "minute");
  if (abs > 7 * 86_400_000) return "";

  for (const [unit, size] of UNITS) {
    if (abs >= size) return formatter.format(Math.trunc(diff / size), unit);
  }
  return "";
}
