"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CreditCard, LayoutGrid, List, Plus } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { TransactionEditor } from "./TransactionEditor";
import { Toast } from "./Toast";
import { AccountMenu } from "./AccountMenu";
import { Banners } from "./Banners";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: List },
];
/** Desktop top nav also shows Cards; on mobile it's an icon in the header. */
const DESKTOP_NAV = [...NAV, { href: "/cards", label: "Cards", icon: CreditCard }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openEditor } = useStore();

  // Sign-in screens have their own full-page layout.
  if (pathname === "/login" || pathname.startsWith("/auth")) return <>{children}</>;

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-brand text-brand-fg">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M5 16l4-5 4 3 6-8" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Ledger</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {DESKTOP_NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                    active ? "text-text" : "text-muted hover:text-text"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-surface-2"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/cards"
              aria-label="Cards"
              className={`grid size-9 place-items-center rounded-full transition hover:bg-surface-2 sm:hidden ${
                pathname === "/cards" ? "bg-surface-2 text-text" : "text-text-2"
              }`}
            >
              <CreditCard className="size-[18px]" />
            </Link>
            <ThemeToggle />
            <button
              onClick={() => openEditor()}
              className="hidden items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-fg shadow-card transition hover:opacity-90 active:scale-[0.97] sm:flex"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Add expense
            </button>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-32 sm:px-6 sm:pb-16">
        <Banners />
        {children}
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-6">
          {NAV.map(({ href, label, icon: Icon }, i) => {
            const active = pathname === href;
            const item = (
              <Link
                key={href}
                href={href}
                className={`flex w-20 flex-col items-center gap-1 text-[11px] transition-colors ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {label}
              </Link>
            );
            if (i === 0) {
              return [
                item,
                <button
                  key="add"
                  onClick={() => openEditor()}
                  aria-label="Add expense"
                  className="-mt-7 grid size-14 place-items-center rounded-full bg-brand text-brand-fg shadow-[0_10px_30px_-8px_var(--brand)] transition active:scale-95"
                >
                  <Plus className="size-6" strokeWidth={2.5} />
                </button>,
              ];
            }
            return item;
          })}
        </div>
      </nav>

      <TransactionEditor />
      <Toast />
    </div>
  );
}
