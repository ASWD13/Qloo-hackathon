"use client";

import { useCallback, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import styles from "./Refinement.module.css";

export default function Refinement({
  busy,
  onRefine,
}: {
  busy: boolean;
  onRefine: (s: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const id = useId();
  const reducedMotion = useReducedMotion();
  const transition = { duration: reducedMotion ? 0 : 0.18, ease: "easeOut" as const };
  const focusInput = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    node?.focus();
  }, []);
  const focusTrigger = useCallback((node: HTMLButtonElement | null) => {
    if (node && restoreFocus.current) {
      node.focus();
      restoreFocus.current = false;
    }
  }, []);

  function cancel() {
    if (busy) return;
    restoreFocus.current = true;
    setExpanded(false);
  }

  return (
    <motion.section
      className={styles.refinement}
      aria-label="Refine your room"
      layout={!reducedMotion ? "size" : false}
      transition={transition}
    >
      <AnimatePresence initial={false} mode="wait">
        {expanded ? (
          <motion.form
            key="form"
            id={`${id}-form`}
            className={styles.form}
            aria-busy={busy}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) {
                event.preventDefault();
                cancel();
              }
            }}
            onSubmit={(event) => {
              event.preventDefault();
              if (busy || !text.trim()) return;
              void onRefine(text.trim());
            }}
          >
            <label htmlFor={`${id}-input`}>What would you change?</label>
            <p id={`${id}-helper`} className={styles.helper}>
              Describe a change, or try a suggestion.
            </p>
            <input
              ref={focusInput}
              id={`${id}-input`}
              className={styles.input}
              maxLength={500}
              value={text}
              disabled={busy}
              aria-describedby={`${id}-helper`}
              placeholder="Warmer lighting, keep the furniture…"
              onChange={(event) => setText(event.target.value)}
            />
            <div className={styles.suggestions} role="group" aria-label="Suggested changes">
              {["Make it warmer", "Less minimal", "Only change the rug"].map((suggestion) => (
                <button
                  className={styles.suggestion}
                  type="button"
                  disabled={busy}
                  key={suggestion}
                  onClick={() => {
                    setText(suggestion);
                    inputRef.current?.focus();
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <motion.button
                className={`primary-button ${styles.primary}`}
                type="submit"
                disabled={busy || !text.trim()}
                whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                transition={{ type: "spring", stiffness: 450, damping: 32 }}
              >
                {busy ? "Updating room…" : "Update room"}
                <span aria-hidden="true">↗</span>
              </motion.button>
              <button className={styles.cancel} type="button" disabled={busy} onClick={cancel}>
                Cancel
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="trigger"
            ref={focusTrigger}
            className={`primary-button ${styles.primary} ${styles.trigger}`}
            type="button"
            aria-expanded={false}
            aria-controls={`${id}-form`}
            disabled={busy}
            onClick={() => setExpanded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              ...transition,
              scale: { type: "spring", stiffness: 450, damping: 32 },
            }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
          >
            Refine room
            <span aria-hidden="true">↗</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
