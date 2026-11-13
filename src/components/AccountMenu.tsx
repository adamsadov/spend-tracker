"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useStore } from "@/lib/store";

export function AccountMenu() {
  const { account, signOut } = useStore();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full ring-2 ring-transparent transition hover:ring-border"
      >
        <Avatar name={account.name} url={account.avatarUrl} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
            className="absolute top-11 right-0 z-50 w-64 origin-top-right rounded-2xl border border-border bg-surface p-1.5 shadow-card"
          >
            <div className="flex items-center gap-3 px-2.5 py-2.5">
              <Avatar name={account.name} url={account.avatarUrl} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{account.name}</div>
                <div className="truncate text-xs text-muted">{account.email}</div>
              </div>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-text-2 transition hover:bg-surface-2 hover:text-text disabled:opacity-60"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
