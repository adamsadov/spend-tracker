"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { CATEGORIES } from "@/lib/categories";
import { formatDayHeading, formatMoney, formatMonthKey, monthKey } from "@/lib/format";
import { sumCents } from "@/lib/analytics";
import { TransactionRow } from "@/components/TransactionRow";
import type { CategoryId, Transaction } from "@/lib/types";

const ALL = "all";

export default function TransactionsPage() {
  const { ready, transactions, cards, clearAll, loadSample } = useStore();
  const [month, setMonth] = useState<string>(ALL);
  const [category, setCategory] = useState<CategoryId | typeof ALL>(ALL);
  const [card, setCard] = useState<string>(ALL);
  const [query, setQuery] = useState("");

  const months = useMemo(
    () => Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort().reverse(),
    [transactions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter(
      (t) =>
        (month === ALL || monthKey(t.date) === month) &&
        (category === ALL || t.category === category) &&
        (card === ALL || (card === "__none" ? !t.card : t.card === card)) &&
        (!q || t.merchant.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)),
    );
  }, [transactions, month, category, card, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const hasFilters = month !== ALL || category !== ALL || card !== ALL || query !== "";
  const reset = () => {
    setMonth(ALL);
    setCategory(ALL);
    setCard(ALL);
    setQuery("");
  };

  if (!ready) return <div className="h-96 animate-pulse rounded-3xl bg-surface-2" />;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="mt-0.5 text-sm text-muted">
            <span className="tabular">{filtered.length}</span> {filtered.length === 1 ? "entry" : "entries"} ·{" "}
            <span className="tabular font-medium text-text-2">{formatMoney(sumCents(filtered))}</span>
          </p>
        </div>
      </div>

      {/* Filters — one row on desktop, scrollable on mobile */}
      <div className="sticky top-16 z-20 -mx-4 mb-4 bg-bg/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search store or note"
              className="h-10 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-sm outline-none transition focus:border-brand-2 focus:ring-4 focus:ring-brand-2/15"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            <FilterSelect label="Month" value={month} onChange={setMonth}>
              <option value={ALL}>All months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthKey(m)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Category" value={category} onChange={(v) => setCategory(v as CategoryId | typeof ALL)}>
              <option value={ALL}>All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Card" value={card} onChange={setCard}>
              <option value={ALL}>All cards</option>
              {cards.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__none">No card</option>
            </FilterSelect>
            <AnimatePresence>
              {hasFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={reset}
                  className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm text-muted transition hover:bg-surface-2 hover:text-text"
                >
                  <X className="size-3.5" /> Clear
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-text-2">No transactions yet.</p>
          <button onClick={loadSample} className="mt-3 text-sm text-brand underline-offset-4 hover:underline dark:text-brand-3">
            Load sample data
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-center text-text-2">No transactions match these filters.</p>
      ) : (
        <div className="space-y-5">
          <AnimatePresence initial={false}>
            {groups.map(([date, list]) => (
              <motion.section
                key={date}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-3xl border border-border bg-surface p-2 shadow-card sm:p-3"
              >
                <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[13px] sm:px-3">
                  <span className="font-medium text-text-2">{formatDayHeading(date)}</span>
                  <span className="tabular text-muted">{formatMoney(sumCents(list))}</span>
                </div>
                <ul>
                  <AnimatePresence initial={false}>
                    {list.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="mt-10 text-center">
          <button onClick={clearAll} className="text-xs text-muted transition hover:text-danger">
            Clear all data
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const active = value !== ALL;
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 cursor-pointer appearance-none rounded-full border pr-9 pl-4 text-sm outline-none transition focus:ring-4 focus:ring-brand-2/15 ${
          active ? "border-brand-2 bg-brand-soft text-text" : "border-border bg-surface text-text-2 hover:border-brand-3"
        }`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" />
    </label>
  );
}
