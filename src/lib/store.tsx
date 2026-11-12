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

  /** Distinct card names used so far (for filters and form suggestions). */
  cards: string[];
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

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTransactions(sortTx(JSON.parse(raw)));
    } catch {
      /* corrupt or unavailable storage: start empty */
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

  const cards = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.card).filter(Boolean))).sort(),
    [transactions],
  );

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
      merchants,
      editor,
      openEditor,
      closeEditor,
      toast,
      dismissToast,
    }),
    [ready, transactions, add, update, remove, loadSample, clearAll, cards, merchants, editor, openEditor, closeEditor, toast, dismissToast],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
