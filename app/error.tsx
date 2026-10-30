"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="page-fallback">
      <span className="eyebrow">TASTESPACE</span>
      <h1>The studio hit a snag.</h1>
      <p>Your design couldn’t open. Try again or view an example.</p>
      <button className="primary-button" onClick={reset}>
        Reopen studio ↗
      </button>
      <a href="/?demo=true">View example →</a>
    </main>
  );
}
