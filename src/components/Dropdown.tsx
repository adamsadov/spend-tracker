"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

/*
 * App-styled dropdowns that replace the browser's native <select> and <datalist>.
 * The menu renders in a portal with fixed positioning, anchored to its trigger,
 * so it always opens right under (or above) the field — even inside the
 * scrollable, animated modal.
 */

interface Position {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  up: boolean;
}

function useAnchoredPosition(open: boolean, anchor: RefObject<HTMLElement | null>, minWidth: number) {
  const [pos, setPos] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const below = vh - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 220 && above > below;
      const width = Math.min(Math.max(r.width, minWidth), vw - 16);
      const left = Math.max(8, Math.min(r.left, vw - width - 8));
      setPos(
        up
          ? { bottom: vh - r.top + 6, left, width, maxHeight: Math.min(320, above), up }
          : { top: r.bottom + 6, left, width, maxHeight: Math.min(320, below), up },
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchor, minWidth]);

  return pos;
}

function useClickOutside(open: boolean, refs: RefObject<HTMLElement | null>[], onOutside: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (refs.some((r) => r.current?.contains(target))) return;
      onOutside();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onOutside]);
}

/* ---------- Menu panel ---------- */

function MenuPanel({
  open,
  pos,
  panelRef,
  id,
  children,
}: {
  open: boolean;
  pos: Position | null;
  panelRef: RefObject<HTMLDivElement | null>;
  id: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={panelRef}
          id={id}
          initial={{ opacity: 0, y: pos.up ? 6 : -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 600, damping: 38 }}
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: pos.width,
            transformOrigin: pos.up ? "bottom" : "top",
          }}
          className="z-[60] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_12px_40px_-12px_rgb(0_0_0/0.25)]"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function OptionRow({
  label,
  hint,
  icon: Icon,
  color,
  selected,
  active,
  onSelect,
  onHover,
  id,
}: {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  id: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div
      ref={ref}
      id={id}
      role="option"
      aria-selected={selected}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onPointerMove={onHover}
      className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
        active ? "bg-surface-2 text-text" : "text-text-2"
      }`}
    >
      {Icon ? (
        <span
          className="grid size-6 shrink-0 place-items-center rounded-full text-white"
          style={{ background: color ?? "var(--brand)" }}
        >
          <Icon className="size-3.5" strokeWidth={2.2} />
        </span>
      ) : color ? (
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      ) : null}
      <span className={`flex-1 truncate ${selected ? "font-medium text-text" : ""}`}>{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {selected && <Check className="size-4 shrink-0 text-brand dark:text-brand-3" strokeWidth={2.5} />}
    </div>
  );
}

/* ---------- Select ---------- */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  color?: string;
  hint?: string;
}

type Variant = "field" | "pill" | "inline";

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select",
  variant = "field",
  ariaLabel,
  highlighted = false,
  minWidth = 200,
  footer,
  invalid = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  variant?: Variant;
  ariaLabel?: string;
  /** Pill variant: show as an active filter. */
  highlighted?: boolean;
  minWidth?: number;
  /** Extra content under the options, e.g. "Add new card". Receives close + select helpers. */
  footer?: (api: { close: () => void; select: (v: T) => void }) => ReactNode;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const pos = useAnchoredPosition(open, triggerRef, minWidth);
  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(open, [triggerRef, panelRef], close);

  const select = (v: T) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openMenu = () => {
    setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[activeIdx]) select(options[activeIdx].value);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const triggerCls = {
    field: `flex h-11 w-full items-center gap-2 rounded-xl border bg-surface px-3.5 text-left text-[15px] outline-none transition ${
      open ? "border-brand-2 ring-4 ring-brand-2/15" : invalid ? "border-danger" : "border-border hover:border-brand-3"
    }`,
    pill: `flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm outline-none transition focus-visible:ring-4 focus-visible:ring-brand-2/15 ${
      highlighted ? "border-brand-2 bg-brand-soft text-text" : "border-border bg-surface text-text-2 hover:border-brand-3"
    } ${open ? "ring-4 ring-brand-2/15" : ""}`,
    inline: "inline-flex items-center gap-0.5 rounded-md text-text-2 outline-none transition hover:text-text focus-visible:ring-2 focus-visible:ring-brand-2/40",
  }[variant];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={triggerCls}
      >
        {variant === "field" && selected?.color && (
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: selected.color }} />
        )}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-muted/80"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`shrink-0 transition-transform duration-200 ${variant === "inline" ? "size-3 opacity-60" : "size-4 text-muted"} ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <MenuPanel open={open} pos={pos} panelRef={panelRef} id={listId}>
        <div role="listbox" className="overflow-y-auto p-1.5" style={{ maxHeight: pos ? pos.maxHeight - (footer ? 52 : 0) : undefined }}>
          {options.map((o, i) => (
            <OptionRow
              key={o.value}
              id={`${listId}-${i}`}
              label={o.label}
              hint={o.hint}
              icon={o.icon}
              color={o.color}
              selected={o.value === value}
              active={i === activeIdx}
              onSelect={() => select(o.value)}
              onHover={() => setActiveIdx(i)}
            />
          ))}
        </div>
        {footer && <div className="border-t border-border p-1.5">{footer({ close, select })}</div>}
      </MenuPanel>
    </>
  );
}

/* ---------- Combobox (free text with suggestions) ---------- */

export function Combobox({
  value,
  onChange,
  suggestions,
  placeholder,
  invalid = false,
  maxResults = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  invalid?: boolean;
  maxResults?: number;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const q = value.trim().toLowerCase();
  const matches = suggestions
    .filter((s) => !q || (s.toLowerCase().includes(q) && s.toLowerCase() !== q))
    .slice(0, maxResults);
  const showing = open && matches.length > 0;
  const pos = useAnchoredPosition(showing, inputRef, 200);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(open, [inputRef, panelRef], close);

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showing) {
      if (e.key === "ArrowDown" && matches.length) {
        e.preventDefault();
        setOpen(true);
        setActiveIdx(0);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0 && matches[activeIdx]) {
      e.preventDefault();
      pick(matches[activeIdx]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showing}
        aria-controls={showing ? listId : undefined}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onKeyDown={onKeyDown}
        className={`h-11 w-full rounded-xl border bg-surface px-3.5 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-brand-2 focus:ring-4 focus:ring-brand-2/15 ${
          invalid ? "border-danger" : "border-border"
        }`}
      />
      <MenuPanel open={showing} pos={pos} panelRef={panelRef} id={listId}>
        <div role="listbox" className="overflow-y-auto p-1.5" style={{ maxHeight: pos?.maxHeight }}>
          {!q && <div className="px-3 pt-1 pb-1.5 text-xs font-medium text-muted">Recent</div>}
          {matches.map((s, i) => (
            <OptionRow
              key={s}
              id={`${listId}-${i}`}
              label={s}
              selected={false}
              active={i === activeIdx}
              onSelect={() => pick(s)}
              onHover={() => setActiveIdx(i)}
            />
          ))}
        </div>
      </MenuPanel>
    </>
  );
}
