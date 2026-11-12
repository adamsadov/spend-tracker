"use client";

import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/*
 * Big centered amount field with per-character animations.
 *
 * A transparent <input> covers the box and handles typing, focus and the mobile
 * keyboard. What you see is a separate display layer: the "$" plus each character
 * as its own animated span, and a custom blinking caret after the last character.
 * The caret is always kept at the end, which is how amount fields behave anyway.
 */
export const AmountInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    invalid?: boolean;
  }
>(function AmountInput({ value, onChange, invalid = false }, ref) {
  const [focused, setFocused] = useState(false);
  const chars = value.split("");
  const empty = value.length === 0;

  const keepCaretAtEnd = (el: HTMLInputElement) => {
    const end = el.value.length;
    if (el.selectionStart !== end || el.selectionEnd !== end) el.setSelectionRange(end, end);
  };

  return (
    <motion.div
      // Small shake when the amount is missing on submit.
      animate={invalid ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className={`relative rounded-2xl transition-colors ${invalid ? "bg-danger-soft" : "bg-surface-2"}`}
    >
      {/* Display layer */}
      <div
        aria-hidden
        className="pointer-events-none flex h-[84px] items-center justify-center text-4xl leading-none font-semibold tracking-tight"
      >
        {/* Slides with the digits as the amount grows/shrinks so it never overlaps them */}
        <motion.span
          layout="position"
          transition={{ type: "spring", stiffness: 700, damping: 40 }}
          className="mr-1 text-2xl font-medium text-muted"
        >
          $
        </motion.span>

        {empty ? (
          <span className="flex items-center">
            <Caret visible={focused} />
            <span className="tabular text-muted/50">0.00</span>
          </span>
        ) : (
          <span className="tabular flex items-center">
            <AnimatePresence initial={false} mode="popLayout">
              {chars.map((ch, i) => (
                <motion.span
                  key={i}
                  layout="position"
                  initial={{ y: 14, opacity: 0, scale: 0.7 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -10, opacity: 0, scale: 0.7, transition: { duration: 0.12 } }}
                  transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 26,
                    mass: 0.6,
                    layout: { type: "spring", stiffness: 700, damping: 40 },
                  }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </AnimatePresence>
            <Caret visible={focused} layout />
          </span>
        )}
      </div>

      {/* Real input, invisible, on top */}
      <input
        ref={ref}
        aria-label="Amount"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          keepCaretAtEnd(e.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(e) => keepCaretAtEnd(e.currentTarget)}
        className="absolute inset-0 h-full w-full cursor-text rounded-2xl bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </motion.div>
  );
});

function Caret({ visible, layout = false }: { visible: boolean; layout?: boolean }) {
  return (
    <motion.span
      layout={layout ? "position" : false}
      transition={{ type: "spring", stiffness: 700, damping: 40 }}
      className={`mx-[2px] inline-block h-9 w-[2.5px] rounded-full bg-brand-2 ${visible ? "animate-[caret-blink_1.05s_steps(1)_infinite]" : "opacity-0"}`}
    />
  );
}
