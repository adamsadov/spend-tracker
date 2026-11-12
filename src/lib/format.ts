const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const currencyRound = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}

export function formatMoneyShort(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return "$" + (dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  }
  return currencyRound.format(dollars);
}

/** Parses "12.34", "$1,234.5" etc. into cents. Returns null if invalid. */
export function parseMoneyToCents(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d*\.?\d{0,2}$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const cents = Math.round(parseFloat(cleaned) * 100);
  return Number.isFinite(cents) ? cents : null;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/* ---------- Dates (all local, YYYY-MM-DD strings) ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-11" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatMonthKey(key: string, style: "long" | "short" = "long"): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: style, year: "numeric" });
}

export function formatDayHeading(iso: string): string {
  const today = todayISO();
  const yesterday = toISODate(new Date(Date.now() - 86_400_000));
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}
