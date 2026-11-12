import { CATEGORIES } from "./categories";
import { daysInMonth, parseISODate } from "./format";
import type { CategoryId, Transaction } from "./types";

export type PeriodKind = "month" | "year";

export interface Period {
  kind: PeriodKind;
  year: number;
  /** 0-11, only used when kind === "month" */
  month0: number;
}

export function currentPeriod(kind: PeriodKind): Period {
  const now = new Date();
  return { kind, year: now.getFullYear(), month0: now.getMonth() };
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.kind === "year") return { ...p, year: p.year + delta };
  const d = new Date(p.year, p.month0 + delta, 1);
  return { ...p, year: d.getFullYear(), month0: d.getMonth() };
}

export function isCurrentOrFuture(p: Period): boolean {
  const now = new Date();
  if (p.year !== now.getFullYear()) return p.year > now.getFullYear();
  return p.kind === "year" || p.month0 >= now.getMonth();
}

export function periodLabel(p: Period): string {
  if (p.kind === "year") return String(p.year);
  return new Date(p.year, p.month0, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function inPeriod(t: Transaction, p: Period): boolean {
  const y = Number(t.date.slice(0, 4));
  if (y !== p.year) return false;
  return p.kind === "year" || Number(t.date.slice(5, 7)) - 1 === p.month0;
}

export function sumCents(list: Transaction[]): number {
  return list.reduce((s, t) => s + t.amountCents, 0);
}

export interface CategoryTotal {
  id: CategoryId;
  cents: number;
  count: number;
  share: number;
}

/** Totals in fixed category order (keeps chart colors and adjacency stable). Zero categories omitted. */
export function totalsByCategory(list: Transaction[]): CategoryTotal[] {
  const total = sumCents(list);
  const map = new Map<CategoryId, { cents: number; count: number }>();
  for (const t of list) {
    const cur = map.get(t.category) ?? { cents: 0, count: 0 };
    cur.cents += t.amountCents;
    cur.count += 1;
    map.set(t.category, cur);
  }
  return CATEGORIES.filter((c) => map.has(c.id)).map((c) => {
    const { cents, count } = map.get(c.id)!;
    return { id: c.id, cents, count, share: total ? cents / total : 0 };
  });
}

export interface TrendPoint {
  key: string;
  label: string;
  /** Full label for tooltips */
  fullLabel: string;
  cents: number;
}

/** Daily totals for a month, or monthly totals for a year. */
export function trend(list: Transaction[], p: Period): TrendPoint[] {
  if (p.kind === "month") {
    const n = daysInMonth(p.year, p.month0);
    const buckets = new Array(n).fill(0);
    for (const t of list) buckets[parseISODate(t.date).getDate() - 1] += t.amountCents;
    return buckets.map((cents, i) => {
      const d = new Date(p.year, p.month0, i + 1);
      return {
        key: String(i + 1),
        label: String(i + 1),
        fullLabel: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        cents,
      };
    });
  }
  const buckets = new Array(12).fill(0);
  for (const t of list) buckets[Number(t.date.slice(5, 7)) - 1] += t.amountCents;
  return buckets.map((cents, i) => {
    const d = new Date(p.year, i, 1);
    return {
      key: String(i),
      label: d.toLocaleDateString("en-US", { month: "short" }).slice(0, 3),
      fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      cents,
    };
  });
}

/** Number of days elapsed in the period (for averages). */
export function elapsedDays(p: Period): number {
  const now = new Date();
  if (p.kind === "month") {
    const n = daysInMonth(p.year, p.month0);
    if (p.year === now.getFullYear() && p.month0 === now.getMonth()) return now.getDate();
    return n;
  }
  if (p.year === now.getFullYear()) {
    const start = new Date(p.year, 0, 1);
    return Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1;
  }
  return (p.year % 4 === 0 && p.year % 100 !== 0) || p.year % 400 === 0 ? 366 : 365;
}
