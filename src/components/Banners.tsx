"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { useStore } from "@/lib/store";

/** Notices shown above the page: load errors and the one-time local data import. */
export function Banners() {
  const { loadError, localImport, importing, importLocal, dismissLocalImport } = useStore();

  return (
    <AnimatePresence initial={false}>
      {loadError && (
        <motion.div
          key="error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div>
              <div className="font-medium">Couldn&apos;t load your data</div>
              <div className="mt-0.5 text-text-2">{loadError}</div>
            </div>
          </div>
        </motion.div>
      )}

      {!loadError && localImport && (
        <motion.div
          key="import"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-brand-3/60 bg-brand-soft p-4 sm:flex-row sm:items-center">
            <span className="hidden size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-fg sm:grid">
              <Upload className="size-4" />
            </span>
            <div className="flex-1 text-sm">
              <div className="font-medium">Bring over data from this browser?</div>
              <div className="mt-0.5 text-text-2">
                {describe(localImport.transactions, localImport.cards)} were saved here before you had an account.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismissLocalImport}
                disabled={importing}
                className="h-9 rounded-full px-3.5 text-sm text-text-2 transition hover:bg-surface hover:text-text disabled:opacity-60"
              >
                Don&apos;t import
              </button>
              <button
                type="button"
                onClick={importLocal}
                disabled={importing}
                className="flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-medium text-brand-fg transition hover:opacity-90 disabled:opacity-60"
              >
                {importing && <Loader2 className="size-4 animate-spin" />}
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function describe(tx: number, cards: number): string {
  const parts = [];
  if (tx) parts.push(`${tx} transaction${tx === 1 ? "" : "s"}`);
  if (cards) parts.push(`${cards} card${cards === 1 ? "" : "s"}`);
  const text = parts.join(" and ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
