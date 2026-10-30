import "server-only";
import {
  curatedTextureFallbacks,
  textureRequestSchema,
  textureSlots,
  type TextureOutcome,
  type TextureRequest,
  type TextureSlot,
} from "@/lib/assets/textures";
import { MAX_IMAGE_BYTES, storeTexture, validateImage, type ValidatedImage } from "./textureStore";

export type { TextureOutcome } from "@/lib/assets/textures";
export const DEFAULT_HF_IMAGE_MODEL = "black-forest-labs/FLUX.2-klein-4B";
export interface ImageGenerator {
  readonly model: string;
  generate(request: Pick<TextureRequest, "slot" | "prompt">): Promise<ValidatedImage>;
}
export class ImageGenerationError extends Error {
  constructor(readonly code: string, readonly status?: number) {
    super(code);
    this.name = "ImageGenerationError";
  }
}
const spaceModels = new Map<string, { origin: string; data: (prompt: string) => unknown[] }>([
  ["black-forest-labs/FLUX.2-klein-4B", {
    origin: "https://black-forest-labs-flux-2-klein-4b.hf.space",
    data: (prompt) => [prompt, [], "Distilled (4 steps)", 0, true, 512, 512, 4, 1, false],
  }],
  ["black-forest-labs/FLUX.1-schnell", {
    origin: "https://black-forest-labs-flux-1-schnell.hf.space",
    data: (prompt) => [prompt, 0, true, 512, 512, 4],
  }],
]);
const TIMEOUT_MS = 18_000;
const MAX_ACTIVE = 2;
const MAX_QUEUED = 6;
type ImageGate = { active: number; queue: Array<() => void> };
const processGlobal = globalThis as typeof globalThis & { __tasteSpaceImageGate?: ImageGate };
const gate = processGlobal.__tasteSpaceImageGate ??= { active: 0, queue: [] };
async function acquire(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  if (gate.active < MAX_ACTIVE) { gate.active++; return; }
  if (gate.queue.length >= MAX_QUEUED) throw new ImageGenerationError("BUSY");
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const ready = () => { signal.removeEventListener("abort", abort); resolve(); };
  const abort = () => {
    const index = gate.queue.indexOf(ready);
    if (index >= 0) gate.queue.splice(index, 1);
    reject(signal.reason);
  };
  gate.queue.push(ready);
  signal.addEventListener("abort", abort, { once: true });
  await promise;
}
function release() {
  const next = gate.queue.shift();
  if (next) next();
  else gate.active--;
}
async function boundedBody(response: Response, limit: number): Promise<Uint8Array> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > limit) {
    await response.body?.cancel();
    throw new ImageGenerationError("RESPONSE_TOO_LARGE");
  }
  if (!response.body) throw new ImageGenerationError("EMPTY_RESPONSE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new ImageGenerationError("RESPONSE_TOO_LARGE"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
function imagePrompt(request: Pick<TextureRequest, "slot" | "prompt">): string {
  const purpose = request.slot === "artwork"
    ? "Original abstract or illustrative wall artwork, flat full-bleed square composition."
    : `Seamless repeating ${request.slot === "rug" ? "woven rug" : "bedding textile"} surface swatch, flat orthographic texture, no perspective, no furniture.`;
  return `${purpose} No text, watermarks, logos or recognizable copyrighted characters. Design brief: ${request.prompt}`;
}

async function checked(response: Response): Promise<Response> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new ImageGenerationError("PROVIDER_HTTP_ERROR", response.status);
  }
  return response;
}

/** Consume the Gradio SSE result, not just its HTTP-200 queue acknowledgement. */
async function spaceResult(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream") || !response.body) throw new ImageGenerationError("INVALID_RESPONSE");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "", event = "", data = "", size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 64 * 1024) throw new ImageGenerationError("RESPONSE_TOO_LARGE");
      pending += decoder.decode(chunk.value, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, end).replace(/\r$/, "");
        pending = pending.slice(end + 1);
        if (!line) {
          if (event === "error") {
            const quota = /quota|exceeded|credits|payment|rate.limit/i.test(data);
            throw new ImageGenerationError(quota ? "QUOTA_EXCEEDED" : "SPACE_ERROR");
          }
          if (event === "complete") return JSON.parse(data);
          event = ""; data = "";
        } else if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trimStart();
      }
    }
    throw new ImageGenerationError("INVALID_RESPONSE");
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

// Free ZeroGPU Spaces only: no paid inference-router fallback or arbitrary endpoints.
export class LiveHuggingFaceImageClient implements ImageGenerator {
  readonly model: string;
  private readonly space: { origin: string; data: (prompt: string) => unknown[] };
  constructor(
    private readonly token = "",
    options: { model?: string; fetcher?: typeof fetch } = {},
  ) {
    this.model = options.model ?? DEFAULT_HF_IMAGE_MODEL;
    this.fetcher = options.fetcher ?? fetch;
    const space = spaceModels.get(this.model);
    if (!space) throw new ImageGenerationError("INVALID_CONFIGURATION");
    this.space = space;
  }
  private readonly fetcher: typeof fetch;
  async generate(request: Pick<TextureRequest, "slot" | "prompt">): Promise<ValidatedImage> {
    if (!textureSlots.includes(request.slot) || typeof request.prompt !== "string" || request.prompt.trim().length === 0 || request.prompt.length > 700) throw new ImageGenerationError("INVALID_REQUEST");
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    let acquired = false;
    try {
      await acquire(signal);
      acquired = true;
      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
      const base = `${this.space.origin}/gradio_api`;
      const submitted = await checked(await this.fetcher(`${base}/call/infer`, {
        method: "POST", redirect: "error", cache: "no-store", signal,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ data: this.space.data(imagePrompt(request)) }),
      }));
      if (!submitted.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ImageGenerationError("INVALID_RESPONSE");
      const submission: unknown = JSON.parse(new TextDecoder().decode(await boundedBody(submitted, 8192)));
      const eventId = (submission as { event_id?: unknown } | null)?.event_id;
      if (typeof eventId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(eventId)) throw new ImageGenerationError("INVALID_RESPONSE");
      const result = await spaceResult(await checked(await this.fetcher(`${base}/call/infer/${eventId}`, {
        headers, redirect: "error", cache: "no-store", signal,
      })));
      const file = Array.isArray(result) ? result[0] as { url?: unknown } | null : null;
      if (typeof file?.url !== "string" || file.url.length > 2048) throw new ImageGenerationError("INVALID_RESPONSE");
      const imageUrl = new URL(file.url);
      if (imageUrl.origin !== this.space.origin || imageUrl.username || imageUrl.password || imageUrl.search || imageUrl.hash || !imageUrl.pathname.startsWith("/gradio_api/file=")) throw new ImageGenerationError("UNSAFE_IMAGE_URL");
      const image = await checked(await this.fetcher(imageUrl.href, {
        headers, redirect: "error", cache: "no-store", signal,
      }));
      return validateImage(await boundedBody(image, MAX_IMAGE_BYTES), image.headers.get("content-type") ?? "");
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error;
      if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) throw new ImageGenerationError("TIMEOUT");
      // Never retain response bodies, prompts, token-bearing headers or provider exception text.
      throw new ImageGenerationError("INVALID_OR_UNAVAILABLE_IMAGE");
    } finally { if (acquired) release(); }
  }
}

export type ResolvedTextures = {
  textures: Partial<Record<TextureSlot, string>>;
  outcomes: TextureOutcome[];
};

export async function resolveTextureRequests(
  requests: TextureRequest[],
  options: { mock?: boolean; generator?: ImageGenerator } = {},
): Promise<ResolvedTextures> {
  const textures: Partial<Record<TextureSlot, string>> = {};
  const outcomes: TextureOutcome[] = [];
  const token = process.env.HF_TOKEN?.trim() ?? "";
  const enabled = process.env.HF_GENERATE_TEXTURES !== "false";
  let generator = options.generator;
  let configurationFailed = false;
  if (!generator && enabled && !options.mock) {
    try {
      generator = new LiveHuggingFaceImageClient(token, {
        model: process.env.HF_IMAGE_MODEL?.trim() || DEFAULT_HF_IMAGE_MODEL,
      });
    } catch { configurationFailed = true; }
  }
  const seen = new Set<TextureSlot>();
  const tasks = requests.slice(0, textureSlots.length).map(async (raw) => {
    const parsed = textureRequestSchema.safeParse(raw);
    const slot = parsed.success ? parsed.data.slot : raw?.slot;
    if (!textureSlots.includes(slot) || seen.has(slot)) return;
    seen.add(slot);
    const request = parsed.success ? parsed.data : null;
    let reason = !request ? "invalid-request" : options.mock ? "explicit-mock-mode-curated" : !enabled ? "generation-disabled" : configurationFailed ? "invalid-configuration" : "provider-failed";
    if (request && generator && enabled && !options.mock) {
      try {
        const image = await generator.generate(request);
        // All adapters, including injected implementations, must pass the same image gate.
        textures[slot] = storeTexture(validateImage(image.bytes, image.mime));
        outcomes.push({ slot, source: "generated", reason: "generated-512x512", model: generator.model });
        return;
      } catch (error) {
        reason = error instanceof ImageGenerationError
          ? `${error.code.toLowerCase().replaceAll("_", "-")}${error.status ? `-${error.status}` : ""}`
          : "invalid-or-unavailable-image";
      }
    }
    textures[slot] = request?.fallback ?? curatedTextureFallbacks[slot];
    outcomes.push({ slot, source: "curated", reason, model: generator?.model ?? null });
  });
  await Promise.all(tasks);
  // Stable ordering even when network requests finish out of order.
  outcomes.sort((a, b) => textureSlots.indexOf(a.slot) - textureSlots.indexOf(b.slot));
  return { textures, outcomes };
}
