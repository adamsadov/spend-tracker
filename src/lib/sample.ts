import type { CategoryId, Transaction } from "./types";
import { toISODate } from "./format";

/** Generates ~5 months of realistic-looking sample data ending today. */
export function makeSampleTransactions(): Transaction[] {
  const merchants: [string, CategoryId, number, number][] = [
    // name, category, min $, max $
    ["Blue Bottle Coffee", "food", 4, 9],
    ["Chipotle", "food", 11, 18],
    ["Sweetgreen", "food", 13, 19],
    ["Trader Joe's", "groceries", 35, 110],
    ["Whole Foods", "groceries", 25, 140],
    ["Target", "shopping", 15, 120],
    ["Amazon", "shopping", 12, 90],
    ["Uniqlo", "shopping", 30, 110],
    ["Uber", "transport", 9, 32],
    ["Shell", "transport", 35, 60],
    ["AMC Theatres", "entertainment", 14, 32],
    ["Spotify", "entertainment", 11.99, 11.99],
    ["CVS Pharmacy", "health", 8, 45],
    ["Equinox", "health", 60, 60],
    ["Verizon", "bills", 85, 85],
    ["ConEd", "bills", 60, 120],
    ["Robinhood", "investments", 100, 300],
  ];
  const cards = ["Apple Card", "Chase Sapphire", "Amex Gold"];

  // Deterministic pseudo-random so the sample looks the same every time.
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const out: Transaction[] = [];
  const today = new Date();
  for (let daysAgo = 150; daysAgo >= 0; daysAgo--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
    const perDay = Math.floor(rand() * 3);
    for (let i = 0; i < perDay; i++) {
      const [merchant, category, min, max] = merchants[Math.floor(rand() * merchants.length)];
      const amount = min + rand() * (max - min);
      out.push({
        id: `sample-${daysAgo}-${i}`,
        amountCents: Math.round(amount * 100),
        merchant,
        category,
        card: cards[Math.floor(rand() * cards.length)],
        date: toISODate(d),
        note: "",
        source: "manual",
        createdAt: new Date(d.getTime() + i * 1000).toISOString(),
      });
    }
  }
  return out;
}
