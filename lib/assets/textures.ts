import { z } from "zod";

export const textureSlots = ["artwork", "rug", "bedding"] as const;
export type TextureSlot = (typeof textureSlots)[number];

export const curatedTextures = {
  artwork: [
    "/textures/artwork-abstract-ochre.svg",
    "/textures/artwork-abstract-cobalt.svg",
    "/textures/artwork-abstract-clay.svg",
    "/textures/artwork-abstract-moss.svg",
    "/textures/artwork-geometric-grid.svg",
    "/textures/artwork-geometric-orbit.svg",
    "/textures/artwork-editorial-architecture.svg",
    "/textures/artwork-editorial-cutout.svg",
    "/textures/artwork-minimal-line.svg",
    "/textures/artwork-minimal-horizon.svg",
    "/textures/artwork-illustration-botanical.svg",
    "/textures/artwork-illustration-landscape.svg",
  ],
  rug: [
    "/textures/rug-cream-wool.svg",
    "/textures/rug-muted-geometric.svg",
    "/textures/rug-dark-textured.svg",
    "/textures/rug-moss-olive.svg",
    "/textures/rug-warm-rust.svg",
    "/textures/rug-expressive-graphic.svg",
  ],
  bedding: [
    "/textures/bedding-ivory-linen.svg",
    "/textures/bedding-charcoal-layered.svg",
    "/textures/bedding-sage-moss.svg",
    "/textures/bedding-rust-terracotta.svg",
    "/textures/bedding-monochrome-grey.svg",
    "/textures/bedding-expressive-pattern.svg",
  ],
} as const;

const artworkIds = ["abstract_01", "abstract_02", "abstract_03", "abstract_04", "geometric_01", "geometric_02", "editorial_01", "editorial_02", "minimal_01", "minimal_02", "illustration_01", "illustration_02"];
const rugIds = ["cream_wool", "muted_geometric", "dark_textured", "moss_olive", "warm_rust", "expressive_graphic"];
const beddingIds = ["linen_ivory", "charcoal_layered", "sage_moss", "rust_terracotta", "monochrome_grey", "expressive_pattern"];
const curatedPaths = new Set<string>([
  ...Object.values(curatedTextures).flat(),
  "/textures/neutral-weave.svg",
]);

// References, never network locations: no URL parsing, arbitrary local paths or data URLs.
export const textureValueSchema = z.string().max(160).refine(
  (value) => curatedPaths.has(value) || /^\/api\/textures\/[a-f0-9]{64}$/.test(value),
  "Choose a curated texture or a generated local texture ID.",
);
export const curatedTextureFallbacks: Record<TextureSlot, string> = {
  artwork: curatedTextures.artwork[0],
  rug: curatedTextures.rug[0],
  bedding: curatedTextures.bedding[0],
};
export function defaultTextureForSlot(slot: TextureSlot): string {
  return curatedTextureFallbacks[slot];
}
export function curatedTextureFor(slot: TextureSlot, selection?: string): string {
  const ids = slot === "artwork" ? artworkIds : slot === "rug" ? rugIds : beddingIds;
  const index = selection ? ids.indexOf(selection) : -1;
  return curatedTextures[slot][index < 0 ? 0 : index];
}
export const textureRequestSchema = z.object({
  slot: z.enum(textureSlots),
  prompt: z.string().trim().min(1).max(700),
  fallback: z.enum([...curatedPaths]),
}).strict();
export type TextureRequest = z.infer<typeof textureRequestSchema>;
export type TextureOutcome = {
  slot: TextureSlot;
  source: "generated" | "curated";
  reason: string;
  model: string | null;
};
