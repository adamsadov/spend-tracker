import {
  Car,
  CircleEllipsis,
  Clapperboard,
  HeartPulse,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "./types";

export interface Category {
  id: CategoryId;
  name: string;
  /** CSS variable for the category color. Fixed per category so colors never shift between views. */
  color: string;
  icon: LucideIcon;
}

/** Order matters: it is the validated categorical color order. */
export const CATEGORIES: Category[] = [
  { id: "food", name: "Food & Dining", color: "var(--s1)", icon: UtensilsCrossed },
  { id: "groceries", name: "Groceries", color: "var(--s2)", icon: ShoppingBasket },
  { id: "shopping", name: "Shopping", color: "var(--s3)", icon: ShoppingBag },
  { id: "transport", name: "Transport", color: "var(--s4)", icon: Car },
  { id: "bills", name: "Bills & Utilities", color: "var(--s5)", icon: Receipt },
  { id: "entertainment", name: "Entertainment", color: "var(--s6)", icon: Clapperboard },
  { id: "health", name: "Health", color: "var(--s7)", icon: HeartPulse },
  { id: "investments", name: "Investments", color: "var(--s8)", icon: TrendingUp },
  { id: "other", name: "Other", color: "var(--s-other)", icon: CircleEllipsis },
];

const BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

export function getCategory(id: CategoryId): Category {
  return BY_ID[id] ?? BY_ID.other;
}
