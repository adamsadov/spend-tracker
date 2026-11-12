"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Settings2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Select, type SelectOption } from "./Dropdown";

const NONE = "";

/** Card dropdown that lists saved cards and lets you add a new one inline. */
export function CardPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { cards, addCard, closeEditor } = useStore();

  // Keep a card that's on an existing transaction but no longer saved.
  const names = value && !cards.includes(value) ? [...cards, value] : cards;
  const options: SelectOption<string>[] = [
    { value: NONE, label: "No card" },
    ...names.map((c) => ({ value: c, label: c, icon: CreditCard })),
  ];

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Choose card"
      ariaLabel="Card"
      minWidth={240}
      footer={({ select, close }) => (
        <AddCardFooter
          onAdd={(name) => select(addCard(name))}
          onManage={() => {
            close();
            closeEditor();
          }}
        />
      )}
    />
  );
}

function AddCardFooter({ onAdd, onManage }: { onAdd: (name: string) => void; onManage: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  if (adding) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (name.trim()) onAdd(name);
        }}
        className="flex gap-1.5"
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setAdding(false);
            }
          }}
          placeholder="Card name"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-brand-2"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="h-9 rounded-lg bg-brand px-3 text-sm font-medium text-brand-fg transition disabled:opacity-40"
        >
          Save
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-brand transition hover:bg-surface-2 dark:text-brand-3"
      >
        <span className="grid size-6 place-items-center rounded-full bg-brand-soft">
          <Plus className="size-3.5" strokeWidth={2.5} />
        </span>
        Add new card
      </button>
      <Link
        href="/cards"
        onClick={onManage}
        aria-label="Manage cards"
        className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-text"
      >
        <Settings2 className="size-4" />
      </Link>
    </div>
  );
}
