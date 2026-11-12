"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { formatMoney, formatShortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CategoryId, Transaction } from "@/lib/types";

export const TransactionRow = forwardRef<HTMLLIElement, { tx: Transaction; showDate?: boolean }>(
  function TransactionRow({ tx, showDate = false }, ref) {
    const { openEditor, remove, update } = useStore();
    const cat = getCategory(tx.category);
    const Icon = cat.icon;
    const meta = [showDate ? formatShortDate(tx.date) : null, tx.card || null, tx.note || null].filter(Boolean);

    return (
      <motion.li
        ref={ref}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2 sm:px-3"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full text-white" style={{ background: cat.color }}>
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <button onClick={() => openEditor(tx)} className="block max-w-full truncate text-left text-[15px] font-medium">
            {tx.merchant}
          </button>
          <div className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
            {/* Quick category change */}
            <label className="relative inline-flex shrink-0 items-center gap-0.5 rounded-md text-text-2 hover:text-text">
              {cat.name}
              <ChevronDown className="size-3 opacity-60" />
              <select
                aria-label={`Category for ${tx.merchant}`}
                value={tx.category}
                onChange={(e) => update(tx.id, { category: e.target.value as CategoryId })}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {meta.length > 0 && <span className="truncate">· {meta.join(" · ")}</span>}
          </div>
        </div>

        <div className="tabular shrink-0 text-right text-[15px] font-semibold">{formatMoney(tx.amountCents)}</div>

        <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            onClick={() => openEditor(tx)}
            className="hidden size-8 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-text sm:grid"
            aria-label={`Edit ${tx.merchant}`}
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => remove(tx.id)}
            className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger"
            aria-label={`Delete ${tx.merchant}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </motion.li>
    );
  },
);
