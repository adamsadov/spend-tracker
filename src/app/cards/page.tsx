"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CreditCard, Pencil, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, monthKey, todayISO } from "@/lib/format";
import { Card } from "@/components/ui";

export default function CardsPage() {
  const { ready, cards, transactions, addCard } = useStore();
  const [name, setName] = useState("");

  const stats = useMemo(() => {
    const thisMonth = monthKey(todayISO());
    const map = new Map<string, { count: number; monthCents: number }>();
    for (const t of transactions) {
      if (!t.card) continue;
      const s = map.get(t.card) ?? { count: 0, monthCents: 0 };
      s.count += 1;
      if (monthKey(t.date) === thisMonth) s.monthCents += t.amountCents;
      map.set(t.card, s);
    }
    return map;
  }, [transactions]);

  if (!ready) return <div className="h-64 animate-pulse rounded-3xl bg-surface-2" />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCard(name);
    setName("");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Cards</h1>
      <p className="mt-0.5 text-sm text-muted">The cards you pay with. They show up when you add an expense.</p>

      <Card className="mt-5">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New card, e.g. Chase Sapphire"
            className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-brand-2 focus:ring-4 focus:ring-brand-2/15"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-medium text-brand-fg transition hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Add card
          </button>
        </form>

        {cards.length === 0 ? (
          <p className="pt-10 pb-6 text-center text-sm text-muted">No cards saved yet.</p>
        ) : (
          <ul className="mt-4 -mx-2 sm:-mx-3">
            <AnimatePresence initial={false}>
              {cards.map((c) => (
                <CardRow key={c} name={c} count={stats.get(c)?.count ?? 0} monthCents={stats.get(c)?.monthCents ?? 0} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
}

function CardRow({ name, count, monthCents }: { name: string; count: number; monthCents: number }) {
  const { renameCard, removeCard } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const save = () => {
    if (draft.trim() && draft.trim() !== name) renameCard(name, draft);
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2 sm:px-3"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand dark:text-brand-3">
        <CreditCard className="size-[18px]" />
      </span>

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="flex min-w-0 flex-1 items-center gap-1.5"
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft(name);
                setEditing(false);
              }
            }}
            className="h-9 min-w-0 flex-1 rounded-lg border border-brand-2 bg-surface px-3 text-[15px] outline-none ring-4 ring-brand-2/15"
          />
          <IconBtn label="Save name" type="submit">
            <Check className="size-4" />
          </IconBtn>
          <IconBtn
            label="Cancel"
            onClick={() => {
              setDraft(name);
              setEditing(false);
            }}
          >
            <X className="size-4" />
          </IconBtn>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-medium">{name}</div>
            <div className="text-[13px] text-muted">
              {count} {count === 1 ? "transaction" : "transactions"}
              {monthCents > 0 && <> · {formatMoney(monthCents)} this month</>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <IconBtn label={`Rename ${name}`} onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
            </IconBtn>
            <IconBtn label={`Remove ${name}`} danger onClick={() => removeCard(name)}>
              <Trash2 className="size-4" />
            </IconBtn>
          </div>
        </>
      )}
    </motion.li>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  type = "button",
  danger = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  danger?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-full text-muted transition ${
        danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
