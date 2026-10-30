import { z } from "zod";
const tasteList = z.array(z.string().trim().min(1).max(80)).max(3);
export const tasteSchema = z
  .object({
    music: tasteList,
    film: tasteList,
    brands: tasteList,
    wildcard: z.string().trim().max(240).default(""),
  })
  .strict()
  .refine(
    (t) =>
      t.music.length + t.film.length + t.brands.length > 0 ||
      t.wildcard.length > 0,
    { message: "Add at least one taste." },
  );
export type Taste = z.infer<typeof tasteSchema>;
export const entitySchema = z
  .object({
    id: z.string().min(1).max(120),
    name: z.string().max(160),
    type: z.string().max(80),
    tags: z.array(z.string().max(100)).max(12),
  })
  .strict();
export type CulturalEntity = z.infer<typeof entitySchema>;
export const contextSchema = z
  .object({
    source: z.enum(["live", "mock", "unavailable", "omitted"]),
    entities: z.array(entitySchema).max(9),
    recommendations: z.array(entitySchema).max(18),
    unresolved: z.array(z.string().max(80)).max(9),
    warnings: z.array(z.string().max(240)).max(12),
  })
  .strict();
export type CulturalContext = z.infer<typeof contextSchema>;
export const requestSchema = z
  .object({
    taste: tasteSchema,
    adjacency: z.number().min(0).max(100).default(55),
    demo: z.boolean().default(false),
    generic: z.boolean().default(false),
  })
  .strict();
export type DesignRequest = z.infer<typeof requestSchema>;
