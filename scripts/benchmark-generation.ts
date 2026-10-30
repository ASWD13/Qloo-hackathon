import { profiles } from "../lib/agent/profiles";
import { resultSchema } from "../lib/agent/plan";
const base = process.env.APP_URL || "http://127.0.0.1:3000";
const demo = process.env.BENCHMARK_LIVE !== "true";
console.log(
  demo
    ? "Explicit mock benchmark; NOT live provider latency."
    : "LIVE benchmark. Sends taste data to configured providers.",
);
const rows = [];
for (const profile of profiles) {
  const start = performance.now();
  const response = await fetch(new URL("/api/generate", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taste: profile.taste,
      adjacency: 55,
      demo,
      generic: false,
    }),
  });
  if (!response.ok)
    throw new Error("HTTP " + response.status + ": " + (await response.text()));
  const lines = (await response.text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  const event = lines.find((e) => e.type === "result");
  if (!event) throw new Error(JSON.stringify(lines));
  const result = resultSchema.parse(event.result);
  rows.push({
    profile: profile.name,
    mode: result.planner,
    tools: result.plan.tools.length,
    serverMs: result.durationMs,
    totalHttpMs: Math.round(performance.now() - start),
  });
}
console.table(rows);
