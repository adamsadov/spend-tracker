"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { daysInMonth, formatDayHeading, parseISODate, toISODate, todayISO } from "@/lib/format";
import { MenuPanel, useAnchoredPosition, useClickOutside } from "./Dropdown";

/*
 * App-styled date picker that replaces the browser's native calendar.
 * Opens from the field like the other dropdowns; future dates are disabled
 * since expenses have already happened.
 *
 * Keyboard: arrows move by day/week, PageUp/PageDown by month,
 * Home/End to the start/end of the week, Enter picks, Escape closes.
 */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthView {
  year: number;
  month0: number;
}

const monthOf = (iso: string): MonthView => {
  const d = parseISODate(iso);
  return { year: d.getFullYear(), month0: d.getMonth() };
};

function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

function addMonths(iso: string, n: number): string {
  const d = parseISODate(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
  return toISODate(target);
}

/** The 42 days (6 weeks, Sunday first) shown for a month. Fixed size so the panel never changes height. */
function monthGrid({ year, month0 }: MonthView): string[] {
  const offset = new Date(year, month0, 1).getDay();
  return Array.from({ length: 42 }, (_, i) => toISODate(new Date(year, month0, 1 - offset + i)));
}

const slide: Variants = {
  enter: (dir: number) => ({ x: dir * 28, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -28, opacity: 0 }),
};
const slideTransition = { type: "spring", stiffness: 520, damping: 42 } as const;

export function DatePicker({
  value,
  onChange,
  invalid = false,
  ariaLabel = "Date",
}: {
  value: string;
  onChange: (iso: string) => void;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [focusISO, setFocusISO] = useState(value || today);
  const [view, setView] = useState<MonthView>(() => monthOf(value || today));
  const [dir, setDir] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const pos = useAnchoredPosition(open, triggerRef, 296, 380);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(open, [triggerRef, panelRef], close);

  const openPicker = () => {
    const start = value && value <= today ? value : today;
    setFocusISO(start);
    setView(monthOf(start));
    setDir(0);
    setOpen(true);
  };

  const showMonth = (next: MonthView) => {
    const diff = (next.year - view.year) * 12 + (next.month0 - view.month0);
    if (diff === 0) return;
    setDir(diff > 0 ? 1 : -1);
    setView(next);
  };

  /** Keyboard focus moves to this day, switching months if needed. */
  const moveFocus = (iso: string) => {
    const clamped = iso > today ? today : iso;
    setFocusISO(clamped);
    showMonth(monthOf(clamped));
  };

  const shiftMonth = (n: number) => {
    const d = new Date(view.year, view.month0 + n, 1);
    showMonth({ year: d.getFullYear(), month0: d.getMonth() });
  };

  const select = (iso: string) => {
    onChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Keep keyboard focus on the focused day while the picker is open.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${focusISO}"]`)?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(raf);
  }, [open, focusISO]);

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    const dow = parseISODate(focusISO).getDay();
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusISO, -1),
      ArrowRight: () => addDays(focusISO, 1),
      ArrowUp: () => addDays(focusISO, -7),
      ArrowDown: () => addDays(focusISO, 7),
      PageUp: () => addMonths(focusISO, -1),
      PageDown: () => addMonths(focusISO, 1),
      Home: () => addDays(focusISO, -dow),
      End: () => addDays(focusISO, 6 - dow),
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      moveFocus(move());
    }
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      // Mark handled so the surrounding dialog stays open.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const now = parseISODate(today);
  const atLatest = view.year === now.getFullYear() && view.month0 === now.getMonth();
  const monthLabel = new Date(view.year, view.month0, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const yesterday = addDays(today, -1);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (!open && e.key === "ArrowDown") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={`flex h-11 w-full items-center gap-2 rounded-xl border bg-surface px-3.5 text-left text-[15px] outline-none transition ${
          open ? "border-brand-2 ring-4 ring-brand-2/15" : invalid ? "border-danger" : "border-border hover:border-brand-3"
        }`}
      >
        <CalendarDays className="size-4 shrink-0 text-muted" />
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-muted/80"}`}>
          {value ? formatDayHeading(value) : "Pick a date"}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <MenuPanel open={open} pos={pos} panelRef={panelRef} id={id}>
        <div role="dialog" aria-label="Choose a date" onKeyDown={onPanelKeyDown} className="p-3">
          {/* Month header */}
          <div className="mb-1 flex items-center gap-1">
            <NavButton label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="size-4" />
            </NavButton>
            <div className="relative h-6 flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div
                  key={monthLabel}
                  custom={dir}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                  className="text-center text-sm leading-6 font-semibold"
                  aria-live="polite"
                >
                  {monthLabel}
                </motion.div>
              </AnimatePresence>
            </div>
            <NavButton label="Next month" disabled={atLatest} onClick={() => shiftMonth(1)}>
              <ChevronRight className="size-4" />
            </NavButton>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.div
                key={`${view.year}-${view.month0}`}
                ref={gridRef}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                onKeyDown={onGridKeyDown}
                className="grid grid-cols-7 gap-y-0.5"
              >
                {monthGrid(view).map((iso) => {
                  const d = parseISODate(iso);
                  const inMonth = d.getMonth() === view.month0;
                  const selected = iso === value;
                  const isToday = iso === today;
                  const tone = selected
                    ? "bg-brand font-semibold text-brand-fg"
                    : isToday
                      ? "font-semibold text-brand hover:bg-surface-2 dark:text-brand-3"
                      : inMonth
                        ? "text-text hover:bg-surface-2"
                        : "text-muted/60 hover:bg-surface-2";
                  return (
                    <div key={iso} className="grid place-items-center">
                      <button
                        type="button"
                        data-iso={iso}
                        tabIndex={iso === focusISO ? 0 : -1}
                        disabled={iso > today}
                        aria-pressed={selected}
                        aria-label={d.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                        onClick={() => select(iso)}
                        className={`tabular relative grid size-9 place-items-center rounded-full text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-2/60 disabled:pointer-events-none disabled:text-muted/30 ${tone}`}
                      >
                        {d.getDate()}
                        {isToday && !selected && (
                          <span className="absolute bottom-1 size-1 rounded-full bg-brand-2" aria-hidden />
                        )}
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Shortcuts */}
          <div className="mt-2 flex gap-2 border-t border-border pt-3">
            {[
              { label: "Today", iso: today },
              { label: "Yesterday", iso: yesterday },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => select(q.iso)}
                className={`h-8 flex-1 rounded-full border text-xs font-medium transition ${
                  value === q.iso
                    ? "border-brand-2 bg-brand-soft text-text"
                    : "border-border text-text-2 hover:border-brand-3 hover:text-text"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </MenuPanel>
    </>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-full text-text-2 transition hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
