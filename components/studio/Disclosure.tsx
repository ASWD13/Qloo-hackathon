"use client";

import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export default function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reducedMotion = useReducedMotion();
  return (
    <section className="disclosure">
      <button type="button" className="disclosure-toggle" id={`${id}-toggle`} aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen(!open)}>
        {title}<span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div key="content" id={`${id}-content`} role="region" aria-labelledby={`${id}-toggle`} className="disclosure-reveal" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
          <div className="disclosure-body">{children}</div>
        </motion.div>}
      </AnimatePresence>
    </section>
  );
}
