"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { centsToInput, parseMoneyToCents, todayISO } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import { Combobox } from "./Dropdown";
import { CardPicker } from "./CardPicker";

interface FormState {
  amount: string;
  merchant: string;
  category: CategoryId | null;
  card: string;
  date: string;
  note: string;
}

const EMPTY: FormState = { amount: "", merchant: "", category: null, card: "", date: "", note: "" };

export function TransactionEditor() {
  const { editor, closeEditor, add, update, remove, cards, merchants, transactions } = useStore();
  const editing = editor.editing;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [categoryTouched, setCategoryTouched] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  // Reset form whenever the editor opens.
  useEffect(() => {
    if (!editor.open) return;
    setErrors({});
    setCategoryTouched(!!editing);
    setForm(
      editing
        ? {
            amount: centsToInput(editing.amountCents),
            merchant: editing.merchant,
            category: editing.category,
            card: editing.card,
            date: editing.date,
            note: editing.note,
          }
        : { ...EMPTY, date: todayISO(), card: cards.length === 1 ? cards[0] : "" },
    );
    const t = setTimeout(() => amountRef.current?.focus(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.open, editing]);

  // Escape closes.
  useEffect(() => {
    if (!editor.open) return;
    // Dropdowns handle their own Escape (and mark it handled) before the modal closes.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && closeEditor();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor.open, closeEditor]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Remember the category you used last time at this store.
  const onMerchantChange = (value: string) => {
    set("merchant", value);
    if (categoryTouched) return;
    const match = transactions.find((t) => t.merchant.toLowerCase() === value.trim().toLowerCase());
    if (match) setForm((f) => ({ ...f, merchant: value, category: match.category }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseMoneyToCents(form.amount);
    const next: typeof errors = {};
    if (cents === null || cents <= 0) next.amount = "Enter an amount";
    if (!form.merchant.trim()) next.merchant = "Where did you buy it?";
    if (!form.category) next.category = "Pick a category";
    if (!form.date) next.date = "Pick a date";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      amountCents: cents!,
      merchant: form.merchant.trim(),
      category: form.category!,
      card: form.card.trim(),
      date: form.date,
      note: form.note.trim(),
    };
    if (editing) update(editing.id, payload);
    else add(payload);
    closeEditor();
  };

  return (
    <AnimatePresence>
      {editor.open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEditor}
          />
          <motion.form
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit transaction" : "Add expense"}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 48, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:max-w-md sm:rounded-3xl sm:p-6"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{editing ? "Edit transaction" : "Add expense"}</h2>
              <button
                type="button"
                onClick={closeEditor}
                className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Amount */}
            <label className="block">
              <span className="sr-only">Amount</span>
              <div
                className={`flex items-baseline justify-center gap-1 rounded-2xl py-5 transition-colors ${
                  errors.amount ? "bg-danger-soft" : "bg-surface-2"
                }`}
              >
                <span className="text-2xl font-medium text-muted">$</span>
                <input
                  ref={amountRef}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", sanitizeAmount(e.target.value))}
                  className="tabular w-44 bg-transparent text-center text-4xl font-semibold tracking-tight outline-none placeholder:text-muted/50"
                />
              </div>
              <FieldError msg={errors.amount} />
            </label>

            {/* Merchant */}
            <Field label="Store" error={errors.merchant}>
              <Combobox
                value={form.merchant}
                onChange={onMerchantChange}
                suggestions={merchants}
                placeholder="e.g. Trader Joe's"
                invalid={!!errors.merchant}
              />
            </Field>

            {/* Category */}
            <Field label="Category" error={errors.category}>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((c) => {
                  const selected = form.category === c.id;
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryTouched(true);
                        set("category", c.id);
                      }}
                      aria-pressed={selected}
                      className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11.5px] leading-tight transition ${
                        selected
                          ? "border-brand bg-brand-soft text-text"
                          : "border-border text-text-2 hover:border-brand-3 hover:text-text"
                      }`}
                    >
                      <span
                        className="grid size-7 place-items-center rounded-full text-white"
                        style={{ background: c.color }}
                      >
                        <Icon className="size-3.5" strokeWidth={2.2} />
                      </span>
                      <span className="text-center">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Card" hint="optional">
                <CardPicker value={form.card} onChange={(v) => set("card", v)} />
              </Field>
              <Field label="Date" error={errors.date}>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  className={inputCls(!!errors.date)}
                />
              </Field>
            </div>

            <Field label="Note" hint="optional">
              <input
                placeholder="Anything to remember"
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                className={inputCls(false)}
              />
            </Field>

            <div className="mt-6 flex gap-2">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    remove(editing.id);
                    closeEditor();
                  }}
                  className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border text-danger transition hover:bg-danger-soft"
                  aria-label="Delete transaction"
                >
                  <Trash2 className="size-[18px]" />
                </button>
              )}
              <button
                type="submit"
                className="h-12 flex-1 rounded-2xl bg-brand font-medium text-brand-fg transition hover:opacity-90 active:scale-[0.99]"
              >
                {editing ? "Save changes" : "Add expense"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Digits with at most one decimal point and two decimal places. */
function sanitizeAmount(value: string): string {
  let s = value.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return s;
}

function inputCls(error: boolean) {
  return `h-11 w-full rounded-xl border bg-surface px-3.5 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-brand-2 focus:ring-4 focus:ring-brand-2/15 ${
    error ? "border-danger" : "border-border"
  }`;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 block">
      <div className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-medium text-text-2">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </div>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-1.5 text-xs text-danger"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
