"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  currentPeriod,
  elapsedDays,
  inPeriod,
  isCurrentOrFuture,
  periodLabel,
  shiftPeriod,
  sumCents,
  totalsByCategory,
  trend,
  type Period,
  type PeriodKind,
} from "@/lib/analytics";
import { formatMoney } from "@/lib/format";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { SpendingTrend } from "@/components/SpendingTrend";
import { TransactionRow } from "@/components/TransactionRow";
import { Card, Segmented } from "@/components/ui";

export default function OverviewPage() {
  const { ready, transactions, loadSample, openEditor } = useStore();
  const [period, setPeriod] = useState<Period>(() => currentPeriod("month"));

  const inThis = useMemo(() => transactions.filter((t) => inPeriod(t, period)), [transactions, period]);
  const prevPeriod = useMemo(() => shiftPeriod(period, -1), [period]);
  const prevTotal = useMemo(() => sumCents(transactions.filter((t) => inPeriod(t, prevPeriod))), [transactions, prevPeriod]);
  const total = sumCents(inThis);
  const totals = useMemo(() => totalsByCategory(inThis), [inThis]);
  const trendData = useMemo(() => trend(inThis, period), [inThis, period]);
  const perDay = total / Math.max(1, elapsedDays(period));
  const recent = transactions.slice(0, 6);
  const periodKey = `${period.kind}-${period.year}-${period.month0}`;

  const changeKind = (kind: PeriodKind) => setPeriod((p) => ({ ...currentPeriod(kind), kind }));

  if (!ready) return <Skeleton />;

  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-16 max-w-sm text-center"
      >
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Start tracking</h1>
        <p className="mt-2 text-text-2">Add your first expense, or load some sample data to explore the charts.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => openEditor()}
            className="h-11 rounded-full bg-brand font-medium text-brand-fg transition hover:opacity-90"
          >
            Add expense
          </button>
          <button
            onClick={loadSample}
            className="h-11 rounded-full border border-border font-medium text-text-2 transition hover:bg-surface-2"
          >
            Load sample data
          </button>
        </div>
      </motion.div>
    );
  }

  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;
  const atLatest = isCurrentOrFuture(period);

  return (
    <div className="space-y-5">
      {/* Period controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          id="period-kind"
          value={period.kind}
          onChange={changeKind}
          options={[
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
        />
        <div className="flex items-center gap-1">
          <IconBtn label="Previous period" onClick={() => setPeriod((p) => shiftPeriod(p, -1))}>
            <ChevronLeft className="size-4" />
          </IconBtn>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={periodKey}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="min-w-32 text-center text-sm font-medium"
            >
              {periodLabel(period)}
            </motion.span>
          </AnimatePresence>
          <IconBtn label="Next period" disabled={atLatest} onClick={() => setPeriod((p) => shiftPeriod(p, 1))}>
            <ChevronRight className="size-4" />
          </IconBtn>
        </div>
      </div>

      {/* Hero total */}
      <Card className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full opacity-60 blur-3xl dark:opacity-15"
          style={{ background: "radial-gradient(circle, var(--brand-3), transparent 70%)" }}
        />
        <div className="relative">
          <p className="text-sm text-text-2">Spent {period.kind === "month" ? "this month" : "this year"}</p>
          <AnimatedNumber
            value={total}
            format={formatMoney}
            className="tabular mt-1 block text-4xl font-semibold tracking-tight sm:text-5xl"
          />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Stat label="Transactions" value={String(inThis.length)} />
            <Stat label="Per day" value={formatMoney(Math.round(perDay))} />
            {delta !== null && (
              <div className="flex items-center gap-1.5 text-text-2">
                {delta >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                <span className="tabular font-medium text-text">{Math.abs(Math.round(delta * 100))}%</span>
                <span className="text-muted">
                  {delta >= 0 ? "more" : "less"} than {periodLabel(prevPeriod)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <CategoryBreakdown totals={totals} totalCents={total} periodKey={periodKey} />
        <SpendingTrend data={trendData} period={period} />
      </div>

      {/* Recent */}
      <Card delay={0.2}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight">Recent transactions</h2>
          <Link
            href="/transactions"
            className="group flex items-center gap-1 text-sm text-brand transition hover:opacity-80 dark:text-brand-3"
          >
            View all
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="-mx-2 sm:-mx-3">
          <AnimatePresence initial={false}>
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} showDate />
            ))}
          </AnimatePresence>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted">{label} </span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-full text-text-2 transition hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-40 animate-pulse rounded-full bg-surface-2" />
      <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-3xl bg-surface-2" />
        <div className="h-80 animate-pulse rounded-3xl bg-surface-2" />
      </div>
    </div>
  );
}
