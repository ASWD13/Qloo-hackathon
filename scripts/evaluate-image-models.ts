// Run: NODE_OPTIONS=--conditions=react-server npx tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/evaluate-image-models.ts
// --no-token uses anonymous ZeroGPU quota. Neither route purchases inference credits.
import { ImageGenerationError, LiveHuggingFaceImageClient } from "../lib/huggingface/imageClient";

const candidates = [
  { model: "black-forest-labs/FLUX.2-klein-4B", license: "Apache-2.0", tradeoff: "4-step distilled model; preferred free Space; shared daily GPU quota and queues." },
  { model: "black-forest-labs/FLUX.1-schnell", license: "Apache-2.0", tradeoff: "4-step 512-square alternative; file serving has been less reliable in live checks." },
];
const token = process.argv.includes("--no-token") ? "" : process.env.HF_TOKEN?.trim() ?? "";
const selectedModel = process.argv.find(value => value.startsWith("--model="))?.slice("--model=".length);
if (selectedModel && !candidates.some(candidate => candidate.model === selectedModel)) throw new Error("Choose a supported official free Space model.");
const results = [];
for (const candidate of candidates.filter(value => !selectedModel || value.model === selectedModel)) {
  let availability: unknown = { status: "unavailable" };
  try {
    const response = await fetch(`https://huggingface.co/api/spaces/${candidate.model}`, { signal: AbortSignal.timeout(12_000), redirect: "error" });
    const payload = response.ok ? await response.json() as { runtime?: { stage?: string } } : null;
    availability = { httpStatus: response.status, stage: payload?.runtime?.stage ?? "unknown" };
  } catch { availability = { status: "network-error" }; }
  const started = performance.now();
  let attempt: Record<string, unknown>;
  try {
    const image = await new LiveHuggingFaceImageClient(token, { model: candidate.model }).generate({ slot: "artwork", prompt: "Original geometric print, ochre circle, moss green arcs, warm ivory background; flat colors, edge-to-edge, no border or mockup." });
    attempt = { status: "generated", width: image.width, height: image.height, mime: image.mime, bytes: image.bytes.byteLength };
  } catch (error) {
    attempt = error instanceof ImageGenerationError
      ? { status: "not-generated", code: error.code, httpStatus: error.status ?? null }
      : { status: "not-generated", code: "NETWORK_OR_VALIDATION_ERROR" };
  }
  results.push({ ...candidate, space: `https://huggingface.co/spaces/${candidate.model}`, availability, attempt: { ...attempt, elapsedMs: Math.round(performance.now() - started), authenticated: Boolean(token) } });
}
console.log(JSON.stringify({ evaluatedAt: new Date().toISOString(), resolution: "512x512", note: "Only free ZeroGPU Spaces are called; failures are not successful generation timings. No credentials, provider bodies or prompts are logged.", results }, null, 2));
