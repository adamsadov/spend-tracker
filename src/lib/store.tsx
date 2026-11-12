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
import type { Transaction, TransactionInput } from "./types";
import { makeSampleTransactions } from "./sample";

/*
 * Data layer.
 *
 * For now transactions persist in this browser's localStorage. Every screen talks
 * to this context only (add / update / remove), so swapping the implementation for
 * Supabase later — with real accounts — doesn't touch the UI.
 */

const STORAGE_KEY = "budget-tracker:transactions:v1";
const CARDS_KEY = "budget-tracker:cards:v1";

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface StoreValue {
  ready: boolean;
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

  /* UI state shared across pages */
  editor: { open: boolean; editing: Transaction | null };
  openEditor: (tx?: Transaction) => void;
  closeEditor: () => void;
  toast: Toast | null;
  dismissToast: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Newest date first, then newest created first. */
function sortTx(list: Transaction[]): Transaction[] {
  return [...list].sort((a, b) =>
    a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date),
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editor, setEditor] = useState<StoreValue["editor"]>({ open: false, editing: null });
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const txRef = useRef<Transaction[]>([]);
  txRef.current = transactions;
  const [savedCards, setSavedCards] = useState<string[]>([]);
  const cardsRef = useRef<string[]>([]);
  cardsRef.current = savedCards;

  // Load once on mount.
  useEffect(() => {
    let loaded: Transaction[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = sortTx(JSON.parse(raw));
    } catch {
      /* corrupt or unavailable storage: start empty */
    }
    setTransactions(loaded);
    try {
      const rawCards = localStorage.getItem(CARDS_KEY);
      // First run with saved cards: start from the cards already on transactions.
      setSavedCards(
        rawCards ? JSON.parse(rawCards) : Array.from(new Set(loaded.map((t) => t.card).filter(Boolean))).sort(),
      );
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  // Persist on change (after initial load).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      /* storage full or blocked */
    }
  }, [transactions, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CARDS_KEY, JSON.stringify(savedCards));
    } catch {
      /* ignore */
    }
  }, [savedCards, ready]);

  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

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
      return tx;
    },
    [showToast],
  );

  const update = useCallback((id: string, patch: Partial<TransactionInput>) => {
    setTransactions((prev) => sortTx(prev.map((t) => (t.id === id ? { ...t, ...patch } : t))));
  }, []);

  const remove = useCallback(
    (id: string) => {
      const removed = txRef.current.find((t) => t.id === id);
      if (!removed) return;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showToast(`Deleted ${removed.merchant}`, () => {
        setTransactions((prev) => (prev.some((t) => t.id === removed.id) ? prev : sortTx([removed, ...prev])));
        dismissToast();
      });
    },
    [showToast, dismissToast],
  );

  const loadSample = useCallback(() => {
    setTransactions((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      return sortTx([...makeSampleTransactions().filter((t) => !existing.has(t.id)), ...prev]);
    });
    setSavedCards((prev) => {
      const lower = new Set(prev.map((c) => c.toLowerCase()));
      const extra = Array.from(new Set(makeSampleTransactions().map((t) => t.card))).filter(
        (c) => !lower.has(c.toLowerCase()),
      );
      return [...prev, ...extra];
    });
    showToast("Loaded sample data");
  }, [showToast]);

  const clearAll = useCallback(() => {
    const snapshot = txRef.current;
    setTransactions([]);
    showToast("Cleared all transactions", () => {
      setTransactions(snapshot);
      dismissToast();
    });
  }, [showToast, dismissToast]);

  const addCard = useCallback(
    (name: string) => {
      const clean = name.trim().replace(/\s+/g, " ");
      if (!clean) return "";
      const existing = cardsRef.current.find((c) => c.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      setSavedCards((prev) => [...prev, clean]);
      showToast(`Saved ${clean}`);
      return clean;
    },
    [showToast],
  );

  const renameCard = useCallback((from: string, to: string) => {
    const clean = to.trim().replace(/\s+/g, " ");
    if (!clean || clean === from) return;
    setSavedCards((prev) => {
      const without = prev.filter((c) => c !== from && c.toLowerCase() !== clean.toLowerCase());
      const idx = prev.indexOf(from);
      without.splice(idx === -1 ? without.length : Math.min(idx, without.length), 0, clean);
      return without;
    });
    setTransactions((prev) => prev.map((t) => (t.card === from ? { ...t, card: clean } : t)));
  }, []);

  const removeCard = useCallback(
    (name: string) => {
      const before = cardsRef.current;
      setSavedCards((prev) => prev.filter((c) => c !== name));
      showToast(`Removed ${name}`, () => {
        setSavedCards(before);
        dismissToast();
      });
    },
    [showToast, dismissToast],
  );

  const cards = savedCards;

  const usedCards = useMemo(() => {
    const lower = new Set(savedCards.map((c) => c.toLowerCase()));
    const extra = Array.from(new Set(transactions.map((t) => t.card).filter(Boolean)))
      .filter((c) => !lower.has(c.toLowerCase()))
      .sort();
    return [...savedCards, ...extra];
  }, [savedCards, transactions]);

  const merchants = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.merchant).filter(Boolean))),
    [transactions],
  );

  const openEditor = useCallback((tx?: Transaction) => setEditor({ open: true, editing: tx ?? null }), []);
  const closeEditor = useCallback(() => setEditor((e) => ({ ...e, open: false })), []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
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
      editor,
      openEditor,
      closeEditor,
      toast,
      dismissToast,
    }),
    [
      ready, transactions, add, update, remove, loadSample, clearAll, cards, usedCards, addCard, renameCard,
      removeCard, merchants, editor, openEditor, closeEditor, toast, dismissToast,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
