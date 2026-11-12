export type CategoryId =
  | "food"
  | "groceries"
  | "shopping"
  | "transport"
  | "bills"
  | "entertainment"
  | "health"
  | "investments"
  | "other";

export interface Transaction {
  id: string;
  /** Stored in cents to avoid floating-point rounding errors. */
  amountCents: number;
  merchant: string;
  category: CategoryId;
  /** Free-text card name, e.g. "Chase Sapphire". Empty string if not set. */
  card: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  note: string;
  /** Where the entry came from. "shortcut" will be used by the Apple Pay automation later. */
  source: "manual" | "shortcut";
  createdAt: string;
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "source"> & {
  source?: Transaction["source"];
};
