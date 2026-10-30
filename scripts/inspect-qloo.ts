import { LiveQloo } from "../lib/qloo/adapter";
import { profiles } from "../lib/agent/profiles";
if (!process.env.QLOO_API_KEY) {
  console.error(
    "Missing QLOO_API_KEY. See README → API setup. No live requests made.",
  );
  process.exitCode = 1;
} else {
  const adapter = new LiveQloo(
    process.env.QLOO_API_KEY,
    process.env.QLOO_API_BASE_URL || "https://api.qloo.com",
  );
  for (const p of profiles) {
    const start = performance.now();
    const context = await adapter.context(p.taste);
    console.log(
      JSON.stringify(
        {
          profile: p.name,
          durationMs: Math.round(performance.now() - start),
          context,
        },
        null,
        2,
      ),
    );
    if (context.source !== "live" || !context.recommendations.length)
      process.exitCode = 1;
  }
}
