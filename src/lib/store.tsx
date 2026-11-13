"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { CategoryId, Transaction, TransactionInput } from "./types";
import { makeSampleTransactions } from "./sample";
import { createClient } from "./supabase/client";

/*
 * Data layer, backed by Supabase.
 *
 * Every screen talks to this context only, so the UI doesn't know about the
 * database. Changes are applied on screen immediately and saved in the
 * background; if a save fails, the change is rolled back and a toast says so.
 */

/* Browser storage used before accounts existed; offered once as an import. */
const LEGACY_TX_KEY = "budget-tracker:transactions:v1";
const LEGACY_CARDS_KEY = "budget-tracker:cards:v1";
const LEGACY_DONE_KEY = "budget-tracker:local-import-done";

const PAGE = 1000; // Supabase returns at most 1000 rows per request.

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export interface Account {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface StoreValue {
  ready: boolean;
  /** Set when your data couldn't be loaded (e.g. offline, or the tables don't exist yet). */
  loadError: string | null;
  account: Account | null;
  signOut: () => Promise<void>;

  transactions: Transaction[];
  add: (input: TransactionInput) => Transaction;
  update: (id: string, patch: Partial<TransactionInput>) => void;
  remove: (id: string) => void;
  loadSample: () => void;
  clearAll: () => void;

  /** Your saved cards / payment methods, in the order you added them. */
  cards: string[];
  /** Saved cards plus any other card names that appear on transactions (for filters). */
  usedCards: string[];
  /** Saves a card; returns the stored name (existing name if it's a case-insensitive duplicate). */
  addCard: (name: string) => string;
  /** Renames a saved card and updates every transaction that used it. */
  renameCard: (from: string, to: string) => void;
  /** Removes a saved card. Past transactions keep their card name. */
  removeCard: (name: string) => void;
  /** Distinct merchant names used so far, most recent first. */
  merchants: string[];

  /** Data saved in this browser before you had an account, if any. */
  localImport: { transactions: number; cards: number } | null;
  importing: boolean;
  importLocal: () => Promise<void>;
  dismissLocalImport: () => void;

  /* UI state shared across pages */
  editor: { open: boolean; editing: Transaction | null };
  openEditor: (tx?: Transaction) => void;
  closeEditor: () => void;
  toast: Toast | null;
  dismissToast: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/* ---------- Row mapping ---------- */

interface TxRow {
  id: string;
  amount_cents: number;
  merchant: string;
  category: string;
  card: string;
  date: string;
  note: string;
  source: "manual" | "shortcut";
  created_at: string;
}

interface CardRow {
  name: string;
  created_at: string;
}

const iso = (ts: string) => new Date(ts).toISOString();

function fromRow(r: TxRow): Transaction {
  return {
    id: r.id,
    amountCents: r.amount_cents,
    merchant: r.merchant,
    category: r.category as CategoryId,
    card: r.card,
    date: r.date,
    note: r.note,
    source: r.source,
    createdAt: iso(r.created_at),
  };
}

function toRow(t: Transaction): TxRow {
  return {
    id: t.id,
    amount_cents: t.amountCents,
    merchant: t.merchant,
    category: t.category,
    card: t.card,
    date: t.date,
    note: t.note,
    source: t.source,
    created_at: t.createdAt,
  };
}

function patchToRow(p: Partial<TransactionInput>): Partial<TxRow> {
  const row: Partial<TxRow> = {};
  if (p.amountCents !== undefined) row.amount_cents = p.amountCents;
  if (p.merchant !== undefined) row.merchant = p.merchant;
  if (p.category !== undefined) row.category = p.category;
  if (p.card !== undefined) row.card = p.card;
  if (p.date !== undefined) row.date = p.date;
  if (p.note !== undefined) row.note = p.note;
  if (p.source !== undefined) row.source = p.source;
  return row;
}

function toAccount(user: User): Account {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? "";
  return {
    id: user.id,
    email,
    name: meta.full_name || meta.name || email.split("@")[0] || "You",
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}

/* ---------- Helpers ---------- */

function newId(): string {
  return crypto.randomUUID();
}

/** Newest date first, then newest created first. */
function sortTx(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );
}

const cleanName = (s: string) => s.trim().replace(/\s+/g, " ");

/** Await a Supabase query and throw if it failed. */
async function must<T extends { error: unknown }>(query: PromiseLike<T>): Promise<T> {
  const res = await query;
  if (res.error) throw res.error;
  return res;
}

function chunks<T>(list: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function readLegacy(): { transactions: Transaction[]; cards: string[] } | null {
  try {
    if (localStorage.getItem(LEGACY_DONE_KEY)) return null;
    const tx = JSON.parse(localStorage.getItem(LEGACY_TX_KEY) ?? "[]") as Transaction[];
    const cards = JSON.parse(localStorage.getItem(LEGACY_CARDS_KEY) ?? "[]") as string[];
    if (!Array.isArray(tx) || !Array.isArray(cards)) return null;
    return tx.length || cards.length ? { transactions: tx, cards } : null;
  } catch {
    return null;
  }
}

/* ---------- Provider ---------- */

export function StoreProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const userId = user?.id ?? null;

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardRows, setCardRows] = useState<CardRow[]>([]);
  const [editor, setEditor] = useState<StoreValue["editor"]>({ open: false, editing: null });
  const [toast, setToast] = useState<Toast | null>(null);
  const [legacy, setLegacy] = useState<ReturnType<typeof readLegacy>>(null);
  const [importing, setImporting] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const txRef = useRef<Transaction[]>([]);
  txRef.current = transactions;
  const cardsRef = useRef<CardRow[]>([]);
  cardsRef.current = cardRows;

  /* Auth */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthResolved(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  /* Load this user's data whenever the signed-in user changes */
  useEffect(() => {
    if (!authResolved) return;
    if (!userId) {
      setTransactions([]);
      setCardRows([]);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        const rows: TxRow[] = [];
        for (let from = 0; ; from += PAGE) {
          const { data } = await must(
            supabase
              .from("transactions")
              .select("*")
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id")
              .range(from, from + PAGE - 1),
          );
          const page = (data ?? []) as TxRow[];
          rows.push(...page);
          if (page.length < PAGE) break;
        }
        const { data: cards } = await must(
          supabase.from("cards").select("name, created_at").order("created_at"),
        );
        if (cancelled) return;
        setTransactions(sortTx(rows.map(fromRow)));
        setCardRows(((cards ?? []) as CardRow[]).map((c) => ({ ...c, created_at: iso(c.created_at) })));
        setLoadError(null);
        setLegacy(readLegacy());
      } catch (err) {
        console.error("Loading data failed", err);
        if (!cancelled) setLoadError(err instanceof Error ? err.message : (err as { message?: string })?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authResolved, userId, supabase]);

  /* Toasts */
  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  /** Runs a save in the background; on failure, undoes the on-screen change. */
  const sync = useCallback(
    (task: () => Promise<unknown>, revert: () => void) => {
      task().catch((err) => {
        console.error("Saving failed", err);
        revert();
        showToast("Couldn't save that change. Check your connection and try again.");
      });
    },
    [showToast],
  );

  const insertTransactions = useCallback(
    async (list: Transaction[]) => {
      for (const part of chunks(list)) await must(supabase.from("transactions").insert(part.map(toRow)));
    },
    [supabase],
  );

  /* ---------- Transactions ---------- */

  const add = useCallback(
    (input: TransactionInput) => {
      const tx: Transaction = {
        ...input,
        merchant: input.merchant.trim(),
        card: input.card.trim(),
        note: input.note.trim(),
        source: input.source ?? "manual",
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => sortTx([tx, ...prev]));
      showToast(`Added ${tx.merchant}`);
      sync(
        () => must(supabase.from("transactions").insert(toRow(tx))),
        () => setTransactions((prev) => prev.filter((t) => t.id !== tx.id)),
      );
      return tx;
    },
    [showToast, sync, supabase],
  );

  const update = useCallback(
    (id: string, patch: Partial<TransactionInput>) => {
      const before = txRef.current.find((t) => t.id === id);
      if (!before) return;
      setTransactions((prev) => sortTx(prev.map((t) => (t.id === id ? { ...t, ...patch } : t))));
      sync(
        () => must(supabase.from("transactions").update(patchToRow(patch)).eq("id", id)),
        () => setTransactions((prev) => sortTx(prev.map((t) => (t.id === id ? before : t)))),
      );
    },
    [sync, supabase],
  );

  const remove = useCallback(
    (id: string) => {
      const removed = txRef.current.find((t) => t.id === id);
      if (!removed) return;
      const restore = () =>
        setTransactions((prev) => (prev.some((t) => t.id === removed.id) ? prev : sortTx([removed, ...prev])));
      const drop = () => setTransactions((prev) => prev.filter((t) => t.id !== id));

      drop();
      sync(() => must(supabase.from("transactions").delete().eq("id", id)), restore);
      showToast(`Deleted ${removed.merchant}`, () => {
        restore();
        dismissToast();
        sync(() => must(supabase.from("transactions").insert(toRow(removed))), drop);
      });
    },
    [showToast, dismissToast, sync, supabase],
  );

  const clearAll = useCallback(() => {
    const snapshot = txRef.current;
    if (!userId || snapshot.length === 0) return;
    setTransactions([]);
    sync(() => must(supabase.from("transactions").delete().eq("user_id", userId)), () => setTransactions(snapshot));
    showToast("Cleared all transactions", () => {
      setTransactions(snapshot);
      dismissToast();
      sync(() => insertTransactions(snapshot), () => setTransactions([]));
    });
  }, [userId, showToast, dismissToast, sync, supabase, insertTransactions]);

  /* ---------- Cards ---------- */

  /** Adds any of these card names that aren't saved yet (case-insensitive). */
  const missingCards = useCallback((names: string[]): CardRow[] => {
    const seen = new Set(cardsRef.current.map((c) => c.name.toLowerCase()));
    const out: CardRow[] = [];
    const base = Date.now();
    for (const raw of names) {
      const name = cleanName(raw);
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      out.push({ name, created_at: new Date(base + out.length).toISOString() });
    }
    return out;
  }, []);

  const addCard = useCallback(
    (name: string) => {
      const clean = cleanName(name);
      if (!clean) return "";
      const existing = cardsRef.current.find((c) => c.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing.name;
      const row: CardRow = { name: clean, created_at: new Date().toISOString() };
      setCardRows((prev) => [...prev, row]);
      showToast(`Saved ${clean}`);
      sync(
        () => must(supabase.from("cards").insert(row)),
        () => setCardRows((prev) => prev.filter((c) => c.name !== clean)),
      );
      return clean;
    },
    [showToast, sync, supabase],
  );

  const renameCard = useCallback(
    (from: string, to: string) => {
      const clean = cleanName(to);
      if (!clean || clean === from) return;
      const cardsBefore = cardsRef.current;
      const txBefore = txRef.current;
      // Renaming onto another saved card merges the two.
      const duplicate = cardsBefore.find((c) => c.name !== from && c.name.toLowerCase() === clean.toLowerCase());

      setCardRows((prev) =>
        prev.filter((c) => c !== duplicate).map((c) => (c.name === from ? { ...c, name: clean } : c)),
      );
      setTransactions((prev) => prev.map((t) => (t.card === from ? { ...t, card: clean } : t)));

      sync(
        async () => {
          if (duplicate) await must(supabase.from("cards").delete().eq("name", duplicate.name));
          await must(supabase.from("cards").update({ name: clean }).eq("name", from));
          await must(supabase.from("transactions").update({ card: clean }).eq("card", from));
        },
        () => {
          setCardRows(cardsBefore);
          setTransactions(txBefore);
        },
      );
    },
    [sync, supabase],
  );

  const removeCard = useCallback(
    (name: string) => {
      const row = cardsRef.current.find((c) => c.name === name);
      if (!row) return;
      const restore = () =>
        setCardRows((prev) =>
          prev.some((c) => c.name === row.name)
            ? prev
            : [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at)),
        );
      const drop = () => setCardRows((prev) => prev.filter((c) => c.name !== name));

      drop();
      sync(() => must(supabase.from("cards").delete().eq("name", name)), restore);
      showToast(`Removed ${name}`, () => {
        restore();
        dismissToast();
        sync(() => must(supabase.from("cards").insert(row)), drop);
      });
    },
    [showToast, dismissToast, sync, supabase],
  );

  /* ---------- Bulk: sample data and local import ---------- */

  const loadSample = useCallback(() => {
    const sample = makeSampleTransactions().map((t) => ({ ...t, id: newId() }));
    const newCards = missingCards(sample.map((t) => t.card));
    setTransactions((prev) => sortTx([...sample, ...prev]));
    setCardRows((prev) => [...prev, ...newCards]);
    showToast("Loaded sample data");
    const ids = new Set(sample.map((t) => t.id));
    sync(
      async () => {
        if (newCards.length) await must(supabase.from("cards").insert(newCards));
        await insertTransactions(sample);
      },
      () => {
        setTransactions((prev) => prev.filter((t) => !ids.has(t.id)));
        setCardRows((prev) => prev.filter((c) => !newCards.includes(c)));
      },
    );
  }, [missingCards, showToast, sync, supabase, insertTransactions]);

  const markLegacyDone = () => {
    try {
      localStorage.setItem(LEGACY_DONE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setLegacy(null);
  };

  const importLocal = useCallback(async () => {
    if (!legacy || importing) return;
    setImporting(true);
    try {
      const list = legacy.transactions.map((t) => ({
        ...t,
        id: newId(),
        merchant: (t.merchant ?? "").trim() || "Unknown",
        card: (t.card ?? "").trim(),
        note: (t.note ?? "").trim(),
        source: t.source ?? "manual",
        createdAt: t.createdAt ?? new Date().toISOString(),
      }));
      const newCards = missingCards([...legacy.cards, ...list.map((t) => t.card)]);
      if (newCards.length) await must(supabase.from("cards").insert(newCards));
      await insertTransactions(list);
      setCardRows((prev) => [...prev, ...newCards]);
      setTransactions((prev) => sortTx([...list, ...prev]));
      markLegacyDone();
      showToast(`Imported ${list.length} transaction${list.length === 1 ? "" : "s"}`);
    } catch (err) {
      console.error("Import failed", err);
      showToast("Import failed. Nothing was lost; try again.");
    } finally {
      setImporting(false);
    }
  }, [legacy, importing, missingCards, supabase, insertTransactions, showToast]);

  const dismissLocalImport = useCallback(() => markLegacyDone(), []);

  /* ---------- Account ---------- */

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }, [supabase]);

  /* ---------- Derived ---------- */

  const cards = useMemo(() => cardRows.map((c) => c.name), [cardRows]);

  const usedCards = useMemo(() => {
    const lower = new Set(cards.map((c) => c.toLowerCase()));
    const extra = Array.from(new Set(transactions.map((t) => t.card).filter(Boolean)))
      .filter((c) => !lower.has(c.toLowerCase()))
      .sort();
    return [...cards, ...extra];
  }, [cards, transactions]);

  const merchants = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.merchant).filter(Boolean))),
    [transactions],
  );

  const account = useMemo(() => (user ? toAccount(user) : null), [user]);

  const localImport = useMemo(
    () => (legacy ? { transactions: legacy.transactions.length, cards: legacy.cards.length } : null),
    [legacy],
  );

  const openEditor = useCallback((tx?: Transaction) => setEditor({ open: true, editing: tx ?? null }), []);
  const closeEditor = useCallback(() => setEditor((e) => ({ ...e, open: false })), []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      loadError,
      account,
      signOut,
      transactions,
      add,
      update,
      remove,
      loadSample,
      clearAll,
      cards,
      usedCards,
      addCard,
      renameCard,
      removeCard,
      merchants,
      localImport,
      importing,
      importLocal,
      dismissLocalImport,
      editor,
      openEditor,
      closeEditor,
      toast,
      dismissToast,
    }),
    [
      ready, loadError, account, signOut, transactions, add, update, remove, loadSample, clearAll, cards,
      usedCards, addCard, renameCard, removeCard, merchants, localImport, importing, importLocal,
      dismissLocalImport, editor, openEditor, closeEditor, toast, dismissToast,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
