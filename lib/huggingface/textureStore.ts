import "server-only";
import { createHash } from "node:crypto";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const TEXTURE_EDGE = 512;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 32;
const CACHE_TTL_MS = 60 * 60 * 1000;
export type ValidatedImage = { bytes: Uint8Array; mime: "image/png" | "image/jpeg" | "image/webp"; width: number; height: number };
type StoredTexture = ValidatedImage & { createdAt: number };
// Share across Next route bundles in one process. Separate serverless instances
// intentionally use the route's curated cache-miss fallback.
type TextureCache = { textures: Map<string, StoredTexture>; bytes: number };
const processGlobal = globalThis as typeof globalThis & { __tasteSpaceTextureCache?: TextureCache };
const cache = processGlobal.__tasteSpaceTextureCache ??= { textures: new Map(), bytes: 0 };
const textures = cache.textures;

function dimensions(bytes: Buffer, mime: ValidatedImage["mime"]): [number, number] | null {
  if (mime === "image/png") {
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") return null;
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (mime === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
    let offset = 2;
    while (offset + 3 < bytes.length) {
      if (bytes[offset++] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) return null;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        if (length < 8) return null;
        return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
      }
      offset += length;
    }
    return null;
  }
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.readUInt32LE(4) + 8 !== bytes.length || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    if (bytes[20] & 0x02) return null; // Animated textures are not accepted.
    return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
  }
  if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  return null;
}
export function validateImage(bytes: Uint8Array, contentType: string): ValidatedImage {
  const mime = contentType.split(";", 1)[0].trim().toLowerCase();
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime) || bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("INVALID_IMAGE");
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = dimensions(buffer, mime as ValidatedImage["mime"]);
  if (!size || size[0] !== TEXTURE_EDGE || size[1] !== TEXTURE_EDGE) throw new Error("INVALID_IMAGE");
  return { bytes, mime: mime as ValidatedImage["mime"], width: size[0], height: size[1] };
}
function remove(id: string, texture: StoredTexture) {
  textures.delete(id);
  cache.bytes -= texture.bytes.byteLength;
}
function prune(now: number) {
  for (const [id, texture] of textures) if (now - texture.createdAt >= CACHE_TTL_MS) remove(id, texture);
}
export function storeTexture(image: ValidatedImage): string {
  const now = Date.now();
  prune(now);
  const id = createHash("sha256").update(image.mime).update(image.bytes).digest("hex");
  const existing = textures.get(id);
  if (existing) return `/api/textures/${id}`;
  while (textures.size >= MAX_CACHE_ENTRIES || cache.bytes + image.bytes.byteLength > MAX_CACHE_BYTES) {
    const oldest = textures.entries().next().value;
    if (!oldest) break;
    remove(oldest[0], oldest[1]);
  }
  textures.set(id, { ...image, createdAt: now });
  cache.bytes += image.bytes.byteLength;
  return `/api/textures/${id}`;
}
export function getStoredTexture(id: string): StoredTexture | null {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  prune(Date.now());
  return textures.get(id) ?? null;
}
