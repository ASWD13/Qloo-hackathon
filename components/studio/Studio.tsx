"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import RoomView from "@/components/bedroom/RoomView";
import { useStudio } from "./useStudio";
import Adjacency from "./Adjacency";
import Evidence from "./Evidence";
import Comparison from "./Comparison";
import Refinement from "./Refinement";
import RoomLocks from "./RoomLocks";
import Disclosure from "./Disclosure";
import Questionnaire from "@/components/questionnaire/Questionnaire";
import { profiles } from "@/lib/agent/profiles";
import { label } from "@/lib/assets/catalog";

const stages = ["Finding cultural signals", "Choosing materials", "Styling your space"];

export default function Studio() {
  const state = useStudio();
  const { taste, room, result, busy, error, status, editing, diagnostic } = state;
  const view = busy ? "generating" : editing ? "question" : result ? "result" : error ? "error" : "landing";
  const panel = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [explored, setExplored] = useState(false);
  const palette = result?.plan.palette ?? ["#e6e2d5", "#8e9b73", "#c5a274", "#624331"];
  const selected = [...state.designTaste.music, ...state.designTaste.film, ...state.designTaste.brands, state.designTaste.wildcard].filter(Boolean);
  const mood = result?.plan.designIntent.mood;
  const changes = state.log.filter((entry) => entry !== "Design complete");
  const example = result?.planner === "mock";
  const comparing = busy && status === "Generating two designs with identical settings";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  function focusPanel() {
    if (view !== "landing") panel.current?.querySelector<HTMLElement>("h1, h2")?.focus({ preventScroll: true });
  }

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.18, ease: "easeOut" }}>
      <div className="studio-shell">
        <a className="skip-link" href="#main">Skip to design studio</a>
        <header className="masthead">
          <a className="wordmark" href="/" aria-label="TasteSpace home">TasteSpace<span aria-hidden="true">↗</span></a>
          {view !== "landing" && <button type="button" className="text-button" disabled={busy} onClick={state.startOver}>Start over</button>}
        </header>

        <main id="main" className={`studio is-${view}`} aria-busy={busy}>
          <section className="brief-panel" aria-label={view === "question" ? "Design your bedroom" : "Design direction"}>
              <motion.div ref={panel} key={view} initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} onAnimationComplete={focusPanel} transition={{ duration: reducedMotion ? 0 : 0.16 }}>
                {view === "landing" && <>
                  <span className="eyebrow intro-kicker">A BEDROOM, FROM WHAT YOU LOVE.</span>
                  <h1 className="hero-title"><span>Don’t describe<br />your aesthetic.</span><strong>Show us<br />your taste.</strong></h1>
                  <p className="intro-copy">Your music, films and favourite things. A bedroom that feels like you.</p>
                  <motion.button type="button" className="primary-button" whileTap={{ scale: 0.98 }} onClick={() => state.setEditing(true)}>Design my room <span aria-hidden="true">→</span></motion.button>
                  <button type="button" className="text-button example-link" onClick={() => void state.generate(profiles[0].taste, true)}>View example <span aria-hidden="true">↗</span></button>
                </>}

                {view === "question" && <Questionnaire taste={taste} onChange={state.setTaste} disabled={busy} adjacency={state.adjacency} onAdjacency={state.setAdjacency} onBack={() => state.setEditing(false)} onDesign={() => void state.generate(taste, false)} />}

                {view === "generating" && <div className="generation-heading">
                  <h1 tabIndex={-1}>{comparing ? "Comparing rooms" : "Making your room"}<span className="live-dot" aria-hidden="true" /></h1>
                  <div className="generation-status" role="status" aria-live="polite" aria-atomic="true">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p key={status} initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.12 }}>{status}</motion.p>
                    </AnimatePresence>
                  </div>
                </div>}

                {view === "result" && result && <>
                  <div className="result-kicker"><span className="eyebrow">{state.comparison ? "COMPARISON" : example ? "EXAMPLE ROOM" : "YOUR ROOM"}</span>{example && !state.comparison && <span className="example-tastes">{selected.join(" · ")}</span>}</div>
                  <h1 tabIndex={-1} className="result-title">{result.plan.concept.name}</h1>
                  <ul className="result-mood" aria-label="Room mood">{mood?.map((name, i) => i < 3 ? <li key={`${name}-${i}`}>{name}</li> : null)}</ul>
                  <ul className="palette" aria-label="Room colour palette">{palette.map((color, i) => <motion.li key={color + i} initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18, delay: reducedMotion ? 0 : i * 0.025 }} title={color.toUpperCase()}><span style={{ background: color }} aria-hidden="true" /><span className="sr-only">{color.toUpperCase()}</span></motion.li>)}</ul>
                  {!state.comparison && <dl className="material-index">
                    <div><dt>Materials</dt><dd><span>{label(room.bedFrame)}</span><span>{label(room.bedding)}</span></dd></div>
                    <div><dt>Furniture</dt><dd><span>{label(room.bedType)} bed</span><span>{room.chair === "none" ? "No chair" : label(room.chair)}</span></dd></div>
                    <div><dt>Light</dt><dd><span>{room.lightingTemperature <= 3000 ? "Warm light" : room.lightingTemperature <= 4500 ? "Neutral light" : "Cool light"}</span><span>{room.lightingTemperature} K</span></dd></div>
                  </dl>}
                  {state.comparison && <Comparison pair={state.comparison} side={state.side} onSide={state.setSide} onClose={state.closeComparison} />}
                  {!error && !state.comparison && <Refinement busy={busy} onRefine={state.refine} />}
                  {example && !state.comparison && <button type="button" className="text-button make-own" onClick={() => state.setEditing(true)}>Design my own room <span aria-hidden="true">→</span></button>}
                </>}

                {view === "error" && <div className="error-heading"><span className="eyebrow">YOUR SELECTIONS ARE SAVED</span><h1 tabIndex={-1}>Let’s try<br />that again.</h1></div>}
              </motion.div>

            {error && !busy && <div role="alert" className="error-note">
              <strong>{diagnostic?.provider === "gemini" ? "Design paused" : diagnostic?.provider === "qloo" ? "Discovery paused" : "Room unchanged"}</strong>
              <p>{error}</p>
              <motion.button className="primary-button" whileTap={{ scale: 0.98 }} onClick={state.retryLast}>Try again <span aria-hidden="true">→</span></motion.button>
              <button className="text-button" onClick={() => state.setEditing(true)}>Edit selections</button>
              {!result && <button className="text-button" onClick={() => void state.generate(profiles[0].taste, true)}>View example <span aria-hidden="true">↗</span></button>}
              {process.env.NODE_ENV === "development" && diagnostic && <details className="development-diagnostic"><summary>Error details</summary><dl><dt>Stage</dt><dd>{diagnostic.stage}</dd><dt>Provider</dt><dd>{diagnostic.provider}</dd><dt>Response status</dt><dd>{diagnostic.status ?? "No HTTP response"}</dd><dt>Code</dt><dd>{diagnostic.code}</dd>{diagnostic.issues?.map((issue, i) => <div key={i}><dt>Validation issue</dt><dd>{issue.path || "root"} · {issue.code}</dd></div>)}</dl></details>}
            </div>}
          </section>

          {view !== "question" && view !== "error" && <motion.section layout="position" className="room-column" aria-label="Interactive bedroom design">
            <div className="room-stage">
              <div className="room-stage-header"><span className="eyebrow">{view === "landing" ? "THE BEDROOM" : view === "generating" ? "TAKING SHAPE" : state.comparison ? "TWO PERSPECTIVES" : "YOUR SPACE"}</span><span className="room-edition">TASTESPACE / BEDROOM</span></div>
              <div className="room-viewport" onPointerDown={() => setExplored(true)}><RoomView room={room} resetKey={state.reset} /></div>
              <div className="room-stage-footer"><motion.span className="room-hint" animate={{ opacity: explored ? 0 : 1 }} aria-hidden={explored}><span className="desktop-hint">Drag to rotate · Scroll to zoom</span><span className="touch-hint">Drag to rotate · Pinch to zoom</span></motion.span><button type="button" onClick={() => { state.setReset((x) => x + 1); setExplored(false); }}>Reset view <span aria-hidden="true">↺</span></button></div>
            </div>
            {view === "result" && <div className="room-utility"><span className="eyebrow">{state.comparison ? "COMPARISON PREVIEW" : "DESIGN HISTORY"}</span>{!state.comparison && <div className="history-controls" role="group" aria-label="Design history"><button type="button" disabled={!state.canUndo} onClick={state.undo}><span aria-hidden="true">↶ </span>Undo</button><button type="button" disabled={!state.canRedo} onClick={state.redo}>Redo<span aria-hidden="true"> ↷</span></button></div>}</div>}
          </motion.section>}

          {view === "generating" && <div className="generation-meta">
            {!comparing && <ol className="generation-steps" aria-label="Design stages">{stages.map((stage, i) => <li key={stage} className={i === state.stageIndex ? "current" : i < state.stageIndex ? "complete" : ""} aria-current={i === state.stageIndex ? "step" : undefined}><span className="stage-marker" aria-hidden="true">{i < state.stageIndex ? "✓" : String(i + 1).padStart(2, "0")}</span>{stage}</li>)}</ol>}
            <p className="indie-note"><span className="eyebrow">SMALL STUDIO, BIG IDEAS</span> Live design may take a moment.</p>
          </div>}

          {view === "result" && result && <section className="result-details" aria-label="Explore your design">
            <Evidence result={result} taste={state.designTaste} />
            <Disclosure title="What changed?"><ul className="change-log">{changes.map((entry, i) => <motion.li key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span aria-hidden="true">↳</span>{entry}</motion.li>)}</ul></Disclosure>
            {!state.comparison && <Disclosure title="Keep parts unchanged"><RoomLocks room={room} disabled={busy} onToggle={state.toggleLock} /></Disclosure>}
            {!state.comparison && <Disclosure title="Compare with generic AI"><p className="disclosure-copy">See what cultural context adds to the same references.</p><button type="button" className="text-button disclosure-action" onClick={() => void state.compare()}>Compare rooms <span aria-hidden="true">→</span></button></Disclosure>}
            <Disclosure title="Adjust your taste"><div className="result-taste">{selected.map((name, i) => <span key={`${i}-${name}`}>{name}</span>)}</div><Adjacency value={state.adjacency} onChange={state.setAdjacency} disabled={busy} /><button type="button" className="text-button disclosure-action" onClick={() => void state.generate(state.designTaste, result.planner === "mock")}>Redesign room <span aria-hidden="true">→</span></button><button type="button" className="text-button" onClick={() => state.setEditing(true)}>Edit selections</button></Disclosure>
            {example && !state.comparison && <Disclosure title="Other example rooms"><div className="profile-list">{profiles.map((profile, i) => <button key={profile.id} onClick={() => void state.generate(profile.taste, true)}><span className={`profile-swatch swatch-${i}`} aria-hidden="true" /><span><strong>{profile.name}</strong><small>{[...profile.taste.music, ...profile.taste.film, ...profile.taste.brands].join(" · ")}</small></span><span aria-hidden="true">↗</span></button>)}</div></Disclosure>}
          </section>}
          <output data-testid="consumer-room-state" hidden>{JSON.stringify(room)}</output>
        </main>

        {view !== "question" && <footer className="site-footer"><span>YOUR TASTE. YOUR SPACE.</span><span>CULTURE, MADE SPATIAL.</span></footer>}
      </div>
    </MotionConfig>
  );
}
