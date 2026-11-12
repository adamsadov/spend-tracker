"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatMoneyShort } from "@/lib/format";
import type { Period, TrendPoint } from "@/lib/analytics";
import { Card } from "./ui";

export function SpendingTrend({ data, period }: { data: TrendPoint[]; period: Period }) {
  const hasData = data.some((d) => d.cents > 0);
  const isMonth = period.kind === "month";

  return (
    <Card delay={0.14}>
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold tracking-tight">{isMonth ? "Daily spending" : "Monthly spending"}</h2>
        <p className="text-[13px] text-muted">{isMonth ? "Each bar is one day" : "Each bar is one month"}</p>
      </div>

      <div className="h-56">
        {!hasData ? (
          <p className="grid h-full place-items-center text-sm text-muted">Nothing to chart yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 0, left: -8, bottom: 0 }} barCategoryGap={isMonth ? "18%" : "28%"}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "var(--axis)" }}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                interval={isMonth ? 4 : 0}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickFormatter={(v: number) => formatMoneyShort(v)}
                width={48}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)", radius: 6 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as TrendPoint;
                  return (
                    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-card">
                      <div className="text-xs text-muted">{p.fullLabel}</div>
                      <div className="tabular font-semibold">{formatMoney(p.cents)}</div>
                    </div>
                  );
                }}
              />
              <Bar
                key={`${period.kind}-${period.year}-${period.month0}`}
                dataKey="cents"
                fill="var(--brand-2)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                animationDuration={700}
                activeBar={{ fill: "var(--bar-active)" }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
