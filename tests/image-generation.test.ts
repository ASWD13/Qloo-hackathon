import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { ImageGenerationError, LiveHuggingFaceImageClient, resolveTextureRequests, type ResolvedTextures } from "../lib/huggingface/imageClient";
import { getStoredTexture, validateImage } from "../lib/huggingface/textureStore";
import { curatedTextureFor, type TextureRequest } from "../lib/assets/textures";
import { defaultRoom } from "../lib/room/state";
import { executeTools } from "../lib/room/tools";

const origin = "https://black-forest-labs-flux-2-klein-4b.hf.space";
function png(width = 512): Buffer {
  function chunk(type: string, body: Buffer): Buffer {
    const data = Buffer.concat([Buffer.from(type), body]);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(body.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, data, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(512, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.alloc((width * 4 + 1) * 512))), chunk("IEND", Buffer.alloc(0))]);
}
const image = png();
const requests: TextureRequest[] = [
  { slot: "artwork", prompt: "Original moss line art", fallback: curatedTextureFor("artwork", "minimal_01") },
  { slot: "rug", prompt: "Woven neutral wool", fallback: curatedTextureFor("rug", "cream_wool") },
  { slot: "bedding", prompt: "Sage linen", fallback: curatedTextureFor("bedding", "sage_moss") },
];
function provider(options: { events?: string; imageUrl?: string; image?: Uint8Array; downloadStatus?: number; submission?: string; calls?: string[] } = {}): LiveHuggingFaceImageClient {
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    options.calls?.push(url);
    if (url.endsWith("/call/infer")) return new Response(options.submission ?? JSON.stringify({ event_id: "fixture-event" }), { headers: { "Content-Type": "application/json" } });
    if (url.includes("/call/infer/")) {
      const events = options.events ?? `event: heartbeat\ndata: null\n\nevent: complete\ndata: ${JSON.stringify([{ url: options.imageUrl ?? `${origin}/gradio_api/file=/tmp/gradio/fixture/image.png` }])}\n\n`;
      const bytes = new TextEncoder().encode(events);
      return new Response(new ReadableStream({ start(controller) {
        for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7));
        controller.close();
      } }), { headers: { "Content-Type": "text/event-stream" } });
    }
    return new Response((options.image ?? image) as BodyInit, { status: options.downloadStatus ?? 200, headers: { "Content-Type": "image/png" } });
  };
  return new LiveHuggingFaceImageClient("private-test-token", { fetcher });
}
function assertCompleteCurated(result: ResolvedTextures, expectedReason: string) {
  const room = executeTools(defaultRoom, Object.entries(result.textures).map(([slot, value]) => ({ tool: "set_texture", slot, value })));
  assert.deepEqual({ ...room, textures: defaultRoom.textures }, defaultRoom);
  assert.equal(room.textures.artwork, requests[0].fallback);
  assert.equal(result.outcomes[0].source, "curated");
  assert.equal(result.outcomes[0].reason, expectedReason);
}

test("fragmented queue events produce a locally retrievable image only after completion and download", async () => {
  const result = await resolveTextureRequests([requests[0]], { generator: provider() });
  assert.equal(result.outcomes[0].source, "generated");
  const path = result.textures.artwork!;
  assert.match(path, /^\/api\/textures\/[a-f0-9]{64}$/);
  const stored = getStoredTexture(path.split("/").at(-1)!);
  assert.equal(stored?.width, 512);
  assert.equal(stored?.height, 512);
  assert.equal(stored?.mime, "image/png");
});

test("one successful texture and two exhausted providers still yield a complete unchanged furniture layout", async () => {
  const result = await resolveTextureRequests(requests, { generator: {
    model: "fixture",
    async generate(request) {
      if (request.slot === "rug") throw new ImageGenerationError("PROVIDER_HTTP_ERROR", 402);
      if (request.slot === "bedding") throw new ImageGenerationError("QUOTA_EXCEEDED");
      return validateImage(image, "image/png");
    },
  } });
  const room = executeTools(defaultRoom, Object.entries(result.textures).map(([slot, value]) => ({ tool: "set_texture", slot, value })));
  assert.match(room.textures.artwork!, /^\/api\/textures\//);
  assert.equal(room.textures.rug, requests[1].fallback);
  assert.equal(room.textures.bedding, requests[2].fallback);
  assert.deepEqual({ ...room, textures: defaultRoom.textures }, defaultRoom);
  assert.deepEqual(result.outcomes.map(outcome => outcome.source), ["generated", "curated", "curated"]);
});

test("payment errors fall back without exposing credentials or provider messages", async () => {
  const generator = new LiveHuggingFaceImageClient("private-test-token", { fetcher: async () => new Response("private-test-token: secret provider diagnostics", { status: 402 }) });
  const result = await resolveTextureRequests([requests[0]], { generator });
  assertCompleteCurated(result, "provider-http-error-402");
  assert.ok(!JSON.stringify(result).includes("private-test-token"));
  assert.ok(!JSON.stringify(result).includes("secret provider diagnostics"));
});

test("HTTP-200 quota errors are failures, not completed image generations", async () => {
  const result = await resolveTextureRequests([requests[0]], { generator: provider({ events: 'event: error\ndata: "Daily GPU quota exceeded: private provider detail"\n\n' }) });
  assertCompleteCurated(result, "quota-exceeded");
  assert.ok(!JSON.stringify(result).includes("private provider detail"));
});

test("external image URLs cannot receive a request or server credential", async () => {
  const calls: string[] = [];
  const result = await resolveTextureRequests([requests[0]], { generator: provider({ imageUrl: "https://evil.example/steal", calls }) });
  assertCompleteCurated(result, "unsafe-image-url");
  assert.equal(calls.length, 2);
  assert.ok(calls.every(url => new URL(url).origin === origin));
});

test("missing downloads, malformed metadata, invalid images and timeouts each retain a valid curated room", async () => {
  const cases = [
    { generator: provider({ downloadStatus: 403 }), reason: "provider-http-error-403" },
    { generator: provider({ submission: '{"event_id":"../../private"}' }), reason: "invalid-response" },
    { generator: provider({ events: "event: complete\ndata: {broken}\n\n" }), reason: "invalid-or-unavailable-image" },
    { generator: provider({ image: png(1024) }), reason: "invalid-or-unavailable-image" },
    { generator: new LiveHuggingFaceImageClient("", { fetcher: async () => { throw new DOMException("private timeout", "TimeoutError"); } }), reason: "timeout" },
  ];
  for (const entry of cases) assertCompleteCurated(await resolveTextureRequests([requests[0]], { generator: entry.generator }), entry.reason);
});

test("disabling synthesis skips the image provider but retains all three planned surfaces", async (context) => {
  const prior = process.env.HF_GENERATE_TEXTURES;
  context.after(() => { if (prior === undefined) delete process.env.HF_GENERATE_TEXTURES; else process.env.HF_GENERATE_TEXTURES = prior; });
  process.env.HF_GENERATE_TEXTURES = "false";
  let calls = 0;
  const result = await resolveTextureRequests(requests, { generator: { model: "fixture", async generate() { calls++; throw new Error("Must not run"); } } });
  assert.equal(calls, 0);
  assert.deepEqual(result.textures, Object.fromEntries(requests.map(request => [request.slot, request.fallback])));
  assert.ok(result.outcomes.every(outcome => outcome.source === "curated" && outcome.reason === "generation-disabled"));
});

test("queue overflow returns a complete fallback rather than waiting for saturated GPU work", async () => {
  const barrier = Promise.withResolvers<void>();
  const generator = new LiveHuggingFaceImageClient("", { fetcher: async () => { await barrier.promise; throw new DOMException("Stopped", "AbortError"); } });
  const pending = Array.from({ length: 8 }, () => resolveTextureRequests([requests[0]], { generator }));
  try {
    assertCompleteCurated(await resolveTextureRequests([requests[0]], { generator }), "busy");
  } finally {
    barrier.resolve();
    await Promise.all(pending);
  }
});
