import { getStoredTexture } from "@/lib/huggingface/textureStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(id)) return new Response(null, { status: 404 });
  const texture = getStoredTexture(id);
  if (!texture) {
    // Ephemeral serverless caches can disappear or live in another instance.
    // Never proxy a remote image; this original local weave remains usable in all slots.
    return new Response(null, {
      status: 307,
      headers: {
        Location: "/textures/neutral-weave.svg",
        "Cache-Control": "no-store",
        "X-Texture-Source": "curated-cache-miss",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return new Response(texture.bytes as BodyInit, {
    headers: {
      "Content-Type": texture.mime,
      "Content-Length": String(texture.bytes.byteLength),
      "Cache-Control": "public, max-age=3600, immutable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "X-Texture-Source": "generated",
    },
  });
}
