export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const missing = ["QLOO_API_KEY", "GEMINI_API_KEY"].filter(
      (key) => !process.env[key],
    );
    if (missing.length)
      console.warn(
        "TasteSpace — Missing:\n" +
          missing.map((k) => "- " + k).join("\n") +
          "\nSee README → API setup. Labeled example mode remains available.",
      );
  }
}
