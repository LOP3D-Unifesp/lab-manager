import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useT } from "../../i18n";
import { Card } from "../ui/Card";

// Cores dos gráficos vêm dos tokens do tema (claro e escuro), então acompanham a troca de tema.
const color = (token: string) => `rgb(var(--c-${token}))`;
export const chartColors = [color("primary"), color("success"), color("accent-solid"), color("warning"), color("muted")];

const tooltipStyle = {
  background: color("surface"),
  border: `1px solid ${color("border")}`,
  borderRadius: 8,
  color: color("text"),
  fontSize: 14,
};
const tickStyle = { fill: color("muted"), fontSize: 12 };

export type ChartDatum = { name: string; value: number };

type ChartCardProps = {
  title: string;
  hint?: string;
  children: ReactNode;
  /** Os mesmos dados em tabela, para leitores de tela e para quem prefere números. */
  table?: { headers: string[]; rows: Array<Array<string | number>> };
};

export function ChartCard({ children, hint, table, title }: ChartCardProps) {
  const t = useT();
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h3 className="text-lg font-bold text-text">{title}</h3>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
      {table && table.rows.length > 0 ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-primary">{t("analytics.showTable")}</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-muted">
                  {table.headers.map((header) => (
                    <th className="py-1 pr-3 font-semibold" key={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr className="border-b border-border/60" key={index}>
                    {row.map((cell, cellIndex) => (
                      <td className="py-1 pr-3 text-text" key={cellIndex}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </Card>
  );
}

export function ChartEmpty() {
  const t = useT();
  return <p className="rounded-lg border border-dashed border-border bg-background p-4 text-base text-muted">{t("analytics.noData")}</p>;
}

// Ranking em barras horizontais (equipamentos, projetos, pessoas).
export function RankingChart({ data, valueLabel }: { data: ChartDatum[]; valueLabel: string }) {
  if (data.length === 0) return <ChartEmpty />;
  const rows = data.slice(0, 8);
  return (
    <div role="img" aria-label={valueLabel} style={{ height: Math.max(140, rows.length * 38 + 24) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={color("border")} />
          <XAxis type="number" tick={tickStyle} stroke={color("border")} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={120} tick={tickStyle} stroke={color("border")} interval={0} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: color("primary-soft") }} formatter={(value: number) => [value, valueLabel]} />
          <Bar dataKey="value" fill={color("primary")} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Colunas no tempo (horas ou reservas por dia, semana ou mês).
export function TimeBarChart({ data, valueLabel }: { data: ChartDatum[]; valueLabel: string }) {
  if (data.every((row) => row.value === 0)) return <ChartEmpty />;
  return (
    <div role="img" aria-label={valueLabel} style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={color("border")} />
          <XAxis dataKey="name" tick={tickStyle} stroke={color("border")} minTickGap={16} />
          <YAxis tick={tickStyle} stroke={color("border")} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: color("primary-soft") }} formatter={(value: number) => [value, valueLabel]} />
          <Bar dataKey="value" fill={color("primary")} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Rosca para partes de um todo (situação das reservas, tarefas por status).
export function DonutChart({ data }: { data: ChartDatum[] }) {
  if (data.length === 0) return <ChartEmpty />;
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke={color("surface")}>
            {data.map((_, index) => (
              <Cell key={index} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 13, color: color("text") }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
