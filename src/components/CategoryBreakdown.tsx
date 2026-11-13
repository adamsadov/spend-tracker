"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { getCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/lib/analytics";
import type { CategoryId } from "@/lib/types";
import { Card, Segmented } from "./ui";

type View = "donut" | "bars";

/** Memoized: only re-renders when its totals change, not when something else on the page does. */
export const CategoryBreakdown = memo(function CategoryBreakdown({
  totals,
  totalCents,
  periodKey,
}: {
  totals: CategoryTotal[];
  totalCents: number;
  periodKey: string;
}) {
  const [view, setView] = useState<View>("donut");
  const [hover, setHover] = useState<CategoryId | null>(null);
  const sorted = [...totals].sort((a, b) => b.cents - a.cents);
  const hovered = hover ? totals.find((t) => t.id === hover) : null;

  return (
    <Card delay={0.08}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">By category</h2>
          <p className="text-[13px] text-muted">Where your money went</p>
        </div>
        <Segmented
          id="breakdown-view"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "donut", label: <PieIcon className="size-3.5" />, ariaLabel: "Pie chart" },
            { value: "bars", label: <BarChart3 className="size-3.5 rotate-90" />, ariaLabel: "Bar chart" },
          ]}
        />
      </div>

      {totals.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted">No spending in this period yet.</p>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {view === "donut" ? (
            <motion.div
              key="donut"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className="@container"
            >
              <div className="grid items-center gap-6 @lg:grid-cols-[220px_1fr]">
              <div className="relative mx-auto size-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      key={periodKey}
                      data={totals}
                      dataKey="cents"
                      nameKey="id"
                      innerRadius={74}
                      outerRadius={104}
                      startAngle={90}
                      endAngle={-270}
                      stroke="var(--surface)"
                      strokeWidth={2}
                      cornerRadius={4}
                      isAnimationActive
                      animationDuration={700}
                      onMouseEnter={(_, i) => setHover(totals[i]?.id ?? null)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {totals.map((t) => (
                        <Cell
                          key={t.id}
                          fill={getCategory(t.id).color}
                          opacity={hover && hover !== t.id ? 0.35 : 1}
                          style={{ transition: "opacity 200ms", cursor: "pointer" }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-xs text-muted">{hovered ? getCategory(hovered.id).name : "Total"}</div>
                    <div className="tabular text-xl font-semibold tracking-tight">
                      {formatMoney(hovered ? hovered.cents : totalCents)}
                    </div>
                    {hovered && (
                      <div className="text-xs text-muted">{Math.round(hovered.share * 100)}%</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend doubles as the data table */}
              <ul className="space-y-1">
                {sorted.map((t) => {
                  const c = getCategory(t.id);
                  return (
                    <li
                      key={t.id}
                      onMouseEnter={() => setHover(t.id)}
                      onMouseLeave={() => setHover(null)}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                        hover === t.id ? "bg-surface-2" : ""
                      }`}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate text-text-2">{c.name}</span>
                      <span className="tabular w-10 text-right text-xs text-muted">{Math.round(t.share * 100)}%</span>
                      <span className="tabular w-24 text-right font-medium">{formatMoney(t.cents)}</span>
                    </li>
                  );
                })}
              </ul>
              </div>
            </motion.div>
          ) : (
            <motion.ul
              key="bars"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {sorted.map((t, i) => {
                const c = getCategory(t.id);
                const Icon = c.icon;
                const width = sorted[0].cents ? (t.cents / sorted[0].cents) * 100 : 0;
                return (
                  <li key={t.id}>
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <Icon className="size-4 text-muted" />
                      <span className="flex-1 truncate text-text-2">{c.name}</span>
                      <span className="tabular text-xs text-muted">
                        {t.count} · {Math.round(t.share * 100)}%
                      </span>
                      <span className="tabular w-24 text-right font-medium">{formatMoney(t.cents)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <motion.div
                        key={periodKey + t.id}
                        className="h-full rounded-full"
                        style={{ background: c.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${width}%` }}
                        transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      )}
    </Card>
  );
});
