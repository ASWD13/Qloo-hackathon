"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Taste } from "@/lib/validation/contracts";
import Adjacency from "@/components/studio/Adjacency";
import styles from "./Questionnaire.module.css";

const suggestions = {
  music: [
    "Radiohead",
    "Frank Ocean",
    "Beyoncé",
    "Bad Bunny",
    "Taylor Swift",
    "Kendrick Lamar",
    "Billie Eilish",
    "Daft Punk",
    "Lana Del Rey",
    "The Weeknd",
    "Tyler, the Creator",
    "Arctic Monkeys",
    "SZA",
    "Travis Scott",
    "Charli XCX",
    "Björk",
  ],
  film: [
    "A24",
    "Studio Ghibli",
    "Wes Anderson",
    "Christopher Nolan",
    "Barbie",
    "Marvel",
    "Harry Potter",
    "Star Wars",
    "Blade Runner",
    "Sofia Coppola",
    "Fast & Furious",
    "Dune",
    "The Lord of the Rings",
    "Pixar",
    "Greta Gerwig",
    "Jordan Peele",
    "Bong Joon Ho",
    "Everything Everywhere All at Once",
  ],
  brands: [
    "Muji",
    "Nike",
    "Patagonia",
    "IKEA",
    "Adidas",
    "Uniqlo",
    "LEGO",
    "Apple",
    "Anthropologie",
    "Arc'teryx",
    "COS",
    "Converse",
    "Levi's",
    "Carhartt",
    "Zara",
    "Aesop",
    "New Balance",
    "Gucci",
  ],
};

const categories = ["music", "film", "brands"] as const;
type Category = (typeof categories)[number];
const questions = [
  { label: "Music", title: "Who’s on repeat?" },
  { label: "Film & visual worlds", title: "Which worlds pull you in?" },
  { label: "Brands & objects", title: "What’s your kind of design?" },
  { label: "Room notes", title: "What should your room feel like?" },
];

function StepHeading({
  title,
  focusOnMount,
  descriptionId,
}: {
  title: string;
  focusOnMount: boolean;
  descriptionId?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusOnMount) {
      window.scrollTo({ top: 0, behavior: "instant" });
      heading.current?.focus({ preventScroll: true });
    }
  }, [focusOnMount]);

  return (
    <h1 ref={heading} tabIndex={-1} className={styles.heading} aria-describedby={descriptionId}>
      {title}
    </h1>
  );
}

export default function Questionnaire({
  taste,
  onChange,
  disabled,
  adjacency,
  onAdjacency,
  onDesign,
  onBack,
}: {
  taste: Taste;
  onChange: (taste: Taste) => void;
  disabled: boolean;
  adjacency: number;
  onAdjacency: (n: number) => void;
  onDesign: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState({ music: "", film: "", brands: "" });
  const [error, setError] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const [focusNewStep, setFocusNewStep] = useState(false);
  const id = useId();
  const reducedMotion = useReducedMotion();
  const category = categories[step];
  const reviewing = step === 4;
  const query = category ? drafts[category].trim().toLowerCase() : "";
  const visibleSuggestions = category
    ? query
      ? suggestions[category].filter((value) => value.toLowerCase().includes(query)).slice(0, 9)
      : suggestions[category].slice(0, 9)
    : [];
  const count = categories.reduce((total, key) => total + taste[key].length, 0)
    + (taste.wildcard.trim() ? 1 : 0);
  const transition = { duration: reducedMotion ? 0 : 0.18, ease: "easeOut" as const };
  const tapTransition = { type: "spring" as const, stiffness: 450, damping: 32 };

  function goTo(next: number) {
    setError("");
    setFocusNewStep(true);
    setStep(next);
  }

  function toggle(key: Category, value: string) {
    if (disabled) return;
    const current = taste[key];
    if (current.includes(value)) {
      onChange({ ...taste, [key]: current.filter((item) => item !== value) });
      setError("");
      return;
    }
    if (current.length >= 3) {
      setError("Choose up to three. Remove a pick to add another.");
      return;
    }
    onChange({ ...taste, [key]: [...current, value] });
    if (drafts[key].trim() && value.toLowerCase().includes(drafts[key].trim().toLowerCase())) {
      setDrafts((currentDrafts) => ({ ...currentDrafts, [key]: "" }));
    }
    setError("");
  }

  function commitDraft(key: Category) {
    if (disabled) return false;
    const value = drafts[key].trim();
    if (!value) return true;
    const current = taste[key];
    if (!current.some((item) => item.toLowerCase() === value.toLowerCase())) {
      if (current.length >= 3) {
        setError("Not added yet. Remove a pick or clear the search to continue.");
        search.current?.focus();
        return false;
      }
      onChange({ ...taste, [key]: [...current, value] });
    }
    setDrafts((currentDrafts) => ({ ...currentDrafts, [key]: "" }));
    setError("");
    return true;
  }

  function continueJourney() {
    if (disabled) return;
    if (reviewing) {
      if (!count) {
        setError("Add at least one pick or a wildcard to create your room.");
        setFocusNewStep(true);
        setStep(0);
        return;
      }
      onDesign();
      return;
    }
    if (category && !commitDraft(category)) return;
    goTo(step + 1);
  }

  return (
    <section className={styles.questionnaire} aria-label="Your taste">
      <div className={styles.progress} role="group" aria-label={reviewing ? "Review your selections" : `Step ${step + 1} of 4: ${questions[step].label}`}>
        <span className="eyebrow">{reviewing ? "Review" : `${String(step + 1).padStart(2, "0")} / 04`}</span>
        <span className={styles.progressLabel}>{reviewing ? "Your room brief" : questions[step].label}</span>
        <div className={styles.progressTrack} aria-hidden="true">
          {questions.map((question, index) => (
            <span key={question.label} data-active={reviewing || index <= step} />
          ))}
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={step}
          className={styles.step}
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : -6 }}
          transition={transition}
        >
          <div className={styles.body}>
            <StepHeading
              title={reviewing ? "Ready to create?" : questions[step].title}
              focusOnMount={focusNewStep}
              descriptionId={error ? `${id}-error` : undefined}
            />

            {category ? (
              <>
                <p id={`${id}-hint`} className={styles.hint}>Choose up to 3. Skip any question.</p>
                <div
                  className={styles.options}
                  role="group"
                  aria-label={`${questions[step].label} suggestions`}
                  aria-describedby={`${id}-hint`}
                >
                  {visibleSuggestions.map((value) => (
                      <motion.button
                        type="button"
                        key={value}
                        className={styles.option}
                        aria-pressed={taste[category].includes(value)}
                        disabled={disabled}
                        onClick={() => toggle(category, value)}
                        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                        transition={tapTransition}
                      >
                        <span className={styles.optionName}>{value}</span>
                        <span className={styles.optionMark} aria-hidden="true">
                          {taste[category].includes(value) ? "✓" : "+"}
                        </span>
                      </motion.button>
                    ))}
                  {!visibleSuggestions.length && (
                    <p className={styles.noMatches}>No matching suggestions. Add your own below.</p>
                  )}
                </div>
                <div className={styles.search}>
                  <label htmlFor={`${id}-search`}>Search or add your own</label>
                  <div className={styles.inputRow}>
                    <input
                      ref={search}
                      id={`${id}-search`}
                      type="text"
                      value={drafts[category]}
                      maxLength={80}
                      disabled={disabled}
                      autoComplete="off"
                      placeholder={category === "music" ? "Artist name" : category === "film" ? "Film, director, or world" : "Brand name"}
                      aria-describedby={error ? `${id}-error` : undefined}
                      aria-invalid={!!error}
                      onChange={(event) => {
                        setDrafts({ ...drafts, [category]: event.target.value });
                        setError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          commitDraft(category);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={disabled || !drafts[category].trim()}
                      onClick={() => commitDraft(category)}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className={styles.selections}>
                  <p className={styles.selectionLabel} aria-live="polite">Your picks · {taste[category].length} / 3</p>
                  <motion.div className={styles.chips} layout={!reducedMotion} transition={transition}>
                    <AnimatePresence initial={false} mode="popLayout">
                      {taste[category].map((value) => (
                        <motion.button
                          type="button"
                          key={value}
                          layout={!reducedMotion}
                          initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.98 }}
                          transition={transition}
                          whileTap={reducedMotion ? undefined : { scale: 0.98, transition: tapTransition }}
                          disabled={disabled}
                          onClick={() => {
                            toggle(category, value);
                            search.current?.focus();
                          }}
                          aria-label={`Remove ${value}`}
                        >
                          <span className={styles.chipName}>{value}</span>
                          <span className={styles.chipRemove} aria-hidden="true">×</span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </div>

              </>
            ) : !reviewing ? (
              <div className={styles.wildcard}>
                <p className={styles.hint}>A preference, a place you love, or something to keep. All optional.</p>
                <label htmlFor={`${id}-wildcard`}>Your room notes <span>(optional)</span></label>
                <textarea
                  id={`${id}-wildcard`}
                  value={taste.wildcard}
                  maxLength={240}
                  disabled={disabled}
                  aria-describedby={`${id}-wildcard-count`}
                  placeholder="A low bed, warm lighting, white walls. Or the feeling of a Japanese café…"
                  onChange={(event) => {
                    onChange({ ...taste, wildcard: event.target.value });
                    setError("");
                  }}
                />
                <span id={`${id}-wildcard-count`} className={styles.characterCount}>{taste.wildcard.length} / 240 characters</span>
              </div>
            ) : (
              <>
                <div className={styles.review} aria-label="Review your tastes">
                  {questions.map((question, index) => {
                    const key = categories[index];
                    const values = key ? taste[key] : taste.wildcard.trim() ? [taste.wildcard] : [];
                    return (
                      <div className={styles.reviewRow} key={question.label}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => goTo(index)}
                          aria-label={`Edit ${question.label}`}
                          className={styles.reviewEdit}
                        >
                          <span>{question.label}</span>
                          <span>Edit ↗</span>
                        </button>
                        <p>{values.length ? values.join(" · ") : "No preference"}</p>
                      </div>
                    );
                  })}
                </div>
                <Adjacency value={adjacency} onChange={onAdjacency} disabled={disabled} />
              </>
            )}
          </div>

          <footer className={styles.footer}>
            {error && <p id={`${id}-error`} role="alert" className={styles.error}>{error}</p>}
            <div className={styles.footerActions}>
              <button
                type="button"
                className={`text-button ${styles.back}`}
                disabled={disabled}
                onClick={() => {
                  if (step === 0) onBack();
                  else goTo(step - 1);
                }}
              >
                <span aria-hidden="true">← </span>Back
              </button>
              <button type="button" className={`primary-button ${styles.continue}`} disabled={disabled} onClick={continueJourney}>
                {reviewing ? "Create my room" : "Continue"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </footer>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
