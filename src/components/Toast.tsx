"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastState, useUIActions } from "@/lib/ui";

export function Toast() {
  const toast = useToastState();
  const { dismissToast } = useUIActions();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="pointer-events-auto flex items-center gap-4 rounded-full bg-text py-2.5 pr-2.5 pl-5 text-sm text-bg shadow-card"
          >
            <span className="max-w-[60vw] truncate">{toast.message}</span>
            {toast.undo ? (
              <button
                onClick={toast.undo}
                className="rounded-full bg-bg/15 px-3 py-1 font-medium text-brand-3 transition hover:bg-bg/25"
              >
                Undo
              </button>
            ) : (
              <button onClick={dismissToast} className="rounded-full px-2 py-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
                ✕
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
