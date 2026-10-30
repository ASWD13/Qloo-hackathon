import type { Comparison as Pair } from "@/lib/agent/comparison";
import styles from "./Comparison.module.css";

export default function Comparison({
  pair,
  side,
  onSide,
  onClose,
}: {
  pair: Pair;
  side: "generic" | "cultural";
  onSide: (side: "generic" | "cultural") => void;
  onClose: () => void;
}) {
  const example = pair.generic.planner === "mock" ||
    pair.cultural.planner === "mock" || pair.cultural.context.source === "mock";
  const culturalSource = {
    live: "Live Qloo context",
    mock: "Curated example references, not live-verified Qloo data",
    unavailable: "Unavailable; stated taste only",
    omitted: "Not requested; stated taste only",
  }[pair.cultural.context.source];
  const culturalPreview = {
    live: "With cultural context",
    mock: "With example context",
    unavailable: "Cultural context unavailable",
    omitted: "No cultural context requested",
  }[pair.cultural.context.source];

  return (
    <section className={styles.comparison} aria-label="Compare rooms">
      <div className={styles.heading}>
        <h2>Compare rooms</h2>
        <button className={styles.close} type="button" onClick={onClose}>
          Back to my room <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className={styles.description}>
        Same references. Two fresh rooms, with and without cultural context.
      </p>
      <div
        className={styles.switch}
        role="group"
        aria-label="Comparison room preview"
      >
        <button
          type="button"
          aria-pressed={side === "generic"}
          onClick={() => onSide("generic")}
        >
          <span className={styles.option}>
            <strong>Generic AI</strong>
            <small>Your references only</small>
          </span>
          <span className={styles.selection} aria-hidden="true">{side === "generic" ? "✓" : ""}</span>
        </button>
        <button
          type="button"
          aria-pressed={side === "cultural"}
          onClick={() => onSide("cultural")}
        >
          <span className={styles.option}>
            <strong>TasteSpace</strong>
            <small>{culturalPreview}</small>
          </span>
          <span className={styles.selection} aria-hidden="true">{side === "cultural" ? "✓" : ""}</span>
        </button>
      </div>
      <p className={styles.caption}>
        Your room stays unchanged while you compare.
      </p>
      <details className={styles.details}>
        <summary>How this comparison was made</summary>
        <div className={styles.detailBody}>
          <p>
            Both start from the same neutral bedroom, with the same references,
            catalog, tools, planner and temperature. Neither refines your current room.
          </p>
          <p>
            {example
              ? "This comparison uses illustrative examples, not evidence of Qloo quality uplift."
              : "No winner is claimed. AI results can vary between requests."}
          </p>
          <dl className={styles.provenance}>
            <div>
              <dt>Generic AI planner</dt>
              <dd>{pair.generic.model} · temperature {pair.generic.temperature}</dd>
            </div>
            <div>
              <dt>TasteSpace planner</dt>
              <dd>{pair.cultural.model} · temperature {pair.cultural.temperature}</dd>
            </div>
            <div>
              <dt>Cultural source</dt>
              <dd>{culturalSource}</dd>
            </div>
          </dl>
        </div>
      </details>
    </section>
  );
}
