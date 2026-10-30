"use client";

import { useId } from "react";
import styles from "./Adjacency.module.css";

export default function Adjacency({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const label = value < 30 ? "Keep it close" : value > 70 ? "Surprise me" : "Discover";

  return (
    <div className={styles.adjacency}>
      <label className={styles.heading} htmlFor={id}>How adventurous?</label>
      <p id={`${id}-helper`} className={styles.helper}>
        Stay close to your taste, or try something new.
      </p>
      <input
        id={id}
        className={styles.range}
        type="range"
        min="0"
        max="100"
        value={value}
        disabled={disabled}
        aria-valuetext={label}
        aria-describedby={`${id}-helper`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className={styles.labels} aria-hidden="true">
        <span data-active={value < 30}>Keep it close</span>
        <span data-active={value >= 30 && value <= 70}>Discover</span>
        <span data-active={value > 70}>Surprise me</span>
      </div>
    </div>
  );
}
