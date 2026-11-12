"use client";

import { motion } from "framer-motion";

export function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/** Pill-style segmented control with an animated selection indicator. */
export function Segmented<T extends string>({
  id,
  value,
  options,
  onChange,
  size = "md",
}: {
  id: string;
  value: T;
  options: { value: T; label: React.ReactNode; ariaLabel?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={`relative rounded-full font-medium transition-colors ${
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm"
            } ${active ? "text-text" : "text-muted hover:text-text"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-surface shadow-card"
                transition={{ type: "spring", stiffness: 450, damping: 36 }}
              />
            )}
            <span className="relative flex items-center gap-1">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
