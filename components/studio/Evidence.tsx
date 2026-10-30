"use client";

import Disclosure from "./Disclosure";
import type { DesignResult } from "@/lib/agent/plan";
import type { Taste } from "@/lib/validation/contracts";
import styles from "./Evidence.module.css";

export default function Evidence({
  result,
  taste,
}: {
  result: DesignResult;
  taste: Taste;
}) {
  const context = result.context;
  const tastes = [...taste.music, ...taste.film, ...taste.brands, taste.wildcard]
    .filter(Boolean);
  const sourceLabel = {
    live: "Live Qloo",
    mock: "Curated references",
    unavailable: "Unavailable",
    omitted: "Not requested",
  }[context.source];
  const sourceDescription = {
    live: "Qloo connects your resolved references with adjacent cultural interests.",
    mock: "Example references, not live-verified Qloo data.",
    unavailable: "Qloo context was unavailable. This room uses your stated taste.",
    omitted: "No cultural context was requested. This room uses your stated taste.",
  }[context.source];
  const designNotes = [
    ["Cultural interpretation", result.plan.reasoning.adjacentTasteInfluence],
    ["Materials", result.plan.reasoning.materials],
    ["Lighting", result.plan.reasoning.lighting],
    ["Furniture", result.plan.reasoning.furniture],
    ["Art", result.plan.reasoning.art],
  ];

  return (
    <Disclosure title="Why this room?">
      <ol className={styles.journey}>
        <li className={styles.step}>
          <h3>Your references</h3>
          <ul className={styles.references} aria-label="Your references">
            {tastes.slice(0, 3).map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
          {tastes.length > 3 && (
            <details className={styles.details}>
              <summary>All your references ({tastes.length})</summary>
              <ul className={styles.plainList}>
                {tastes.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </details>
          )}
        </li>
        <li className={styles.step}>
          <h3>{result.plan.concept.name}</h3>
          <p>{result.plan.concept.description}</p>
          {result.planner === "mock" && (
            <p className={styles.caption}>A curated example design.</p>
          )}
        </li>
        {context.recommendations.length > 0 && (
          <li className={styles.step}>
            <h3>Related influences</h3>
            <ul className={styles.references} aria-label="Related influences">
              {context.recommendations.slice(0, 3).map((entity) => (
                <li key={entity.id}>{entity.name}</li>
              ))}
            </ul>
            {context.source === "mock" && (
              <p className={styles.influenceNote}>Curated examples, not live discoveries.</p>
            )}
          </li>
        )}
      </ol>
      <details className={`${styles.details} ${styles.technical}`}>
        <summary>How it was made</summary>
        <div className={styles.detailBody}>
          <div className={styles.stepHeading}>
            <h4>Cultural context</h4>
            <span className={styles.sourceLabel}>{sourceLabel}</span>
          </div>
          <p>{sourceDescription}</p>
          <p>The room is TasteSpace’s interpretation, not Qloo’s furniture advice.</p>
          {context.source === "mock" && (
            <p>These references and their IDs are illustrative examples, not verified Qloo entities.</p>
          )}
          {result.planner === "mock" && (
            <p>This room uses a curated example design, not a live-generated planner response.</p>
          )}
          <details className={styles.details}>
            <summary>Design choices</summary>
            <div className={styles.detailBody}>
              {designNotes.map(([label, explanation]) => (
                <div key={label}>
                  <h4>{label}</h4>
                  <p>{explanation}</p>
                </div>
              ))}
            </div>
          </details>
          <details className={styles.details}>
            <summary>Sources and discoveries{context.warnings.length ? ` · ${context.warnings.length} ${context.warnings.length === 1 ? "note" : "notes"}` : ""}</summary>
            <div className={styles.detailBody}>
              {context.entities.length > 0 && (
                <>
                  <h4>{context.source === "live" ? "Resolved by Qloo" : "Source references"}</h4>
                  <ul className={styles.plainList}>
                    {context.entities.map((entity) => (
                      <li key={entity.id}>
                        {entity.name}
                        <span className={styles.entityType}>
                          {entity.type.replace("urn:entity:", "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {context.recommendations.length > 0 && (
                <>
                  <h4>All related influences</h4>
                  <ul className={styles.plainList}>
                    {context.recommendations.map((entity) => (
                      <li key={entity.id}>
                        {entity.name}
                        <span className={styles.entityType}>
                          {entity.type.replace("urn:entity:", "")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {context.unresolved.length > 0 && (
                <p>
                  Not resolved unambiguously: {context.unresolved.join(", ")}.
                  {" "}These remain your stated preferences, not verified cultural entities.
                </p>
              )}
              {context.warnings.map((warning, index) => (
                <p className={styles.warning} key={index}>{warning}</p>
              ))}
            </div>
          </details>
          <details className={styles.details}>
            <summary>Generation and room records</summary>
            <div className={styles.detailBody}>
              <p>
                Planner: {result.model} · temperature {result.temperature} ·
                server processing {result.durationMs} ms. Observed for this
                request, not a completion-time promise.
              </p>
              <p>
                Geometry uses the catalog; optional original textures use validated local references.
                The records include the plan, constraints, placements, textures, review and tools.
              </p>
              <pre tabIndex={0} aria-label="Cultural sources, design plan and executed room tools">
                {JSON.stringify({
                  context,
                  planner: result.planner,
                  plan: result.plan,
                  constraints: result.room.constraints,
                  textureOutcomes: result.textureOutcomes,
                  review: result.review,
                }, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </details>
    </Disclosure>
  );
}
