import { z } from "zod";
import { hexColor, roomSchema, constraintsSchema, placementsSchema, type RoomState } from "@/lib/room/state";
import { planSchema, toolSchema, executeTools } from "@/lib/room/tools";
import { contextSchema } from "@/lib/validation/contracts";
import { textureRequestSchema, textureSlots } from "@/lib/assets/textures";
const explanation = z.string().min(1).max(600);
export const assetSelectionsSchema = roomSchema.pick({
  floor: true, bedType: true, bedFrame: true, bedding: true, nightstandLeft: true,
  nightstandRight: true, tableLamp: true, floorLamp: true, rug: true, rugSize: true,
  chair: true, artwork: true, storage: true, secondary: true,
});
export function assetSelections(room: RoomState) {
  return assetSelectionsSchema.parse(Object.fromEntries(Object.keys(assetSelectionsSchema.shape).map((field) => [field, Reflect.get(room, field)])));
}
export const designPlanSchema = z.object({
  concept: z.object({ name: z.string().min(1).max(70), description: explanation }).strict(),
  designIntent: z.object({
    mood: z.array(z.string().min(1).max(60)).min(1).max(5), layout: explanation,
    materials: z.array(z.string().min(1).max(60)).min(1).max(6),
    lighting: explanation, furnitureDirection: explanation,
  }).strict(),
  constraints: constraintsSchema,
  assetSelections: assetSelectionsSchema,
  placements: placementsSchema,
  generatedTextureRequests: z.array(textureRequestSchema).max(3).refine(
    (requests) => new Set(requests.map((request) => request.slot)).size === requests.length,
    "Request at most one texture per surface.",
  ),
  palette: z.array(hexColor).min(4).max(6),
  reasoning: z.object({ materials: explanation, lighting: explanation, furniture: explanation, art: explanation, adjacentTasteInfluence: explanation }).strict(),
  tools: planSchema,
}).strict();
export type DesignPlan = z.infer<typeof designPlanSchema>;
export const surfacesSchema = roomSchema.pick({ wallColor: true, accentColor: true, lightingTemperature: true, lightingIntensity: true, decor: true });
// Select once; deterministic compilation avoids inconsistent model-written tool copies.
export const designProposalSchema = designPlanSchema.omit({ tools: true }).extend({ surfaces: surfacesSchema }).strict();
export type DesignProposal = z.infer<typeof designProposalSchema>;
export const critiqueSchema = z.object({
  notes: z.array(z.string().min(1).max(240)).max(6),
  changes: z.array(toolSchema).max(3),
}).strict();
export type DesignCritique = z.infer<typeof critiqueSchema>;
export const resultSchema = z.object({
  plan: designPlanSchema, room: roomSchema, context: contextSchema,
  review: z.object({ performed: z.boolean(), notes: z.array(z.string().max(240)).max(6), appliedChanges: z.number().int().min(0).max(3) }).strict(),
  textureOutcomes: z.array(z.object({ slot: z.enum(textureSlots), source: z.enum(["generated", "curated"]), reason: z.string().max(240), model: z.string().max(160).nullable() }).strict()).max(3),
  planner: z.enum(["mock", "gemini"]), model: z.string().max(100), temperature: z.number(), durationMs: z.number(), baseline: roomSchema,
}).strict().superRefine((result, ctx) => {
  try {
    const executed = executeTools(result.baseline, result.plan.tools);
    if (JSON.stringify(executed) !== JSON.stringify(result.room)) ctx.addIssue({ code: "custom", message: "Room does not match validated tool execution." });
    if (JSON.stringify(assetSelections(executed)) !== JSON.stringify(result.plan.assetSelections) || JSON.stringify(executed.placements) !== JSON.stringify(result.plan.placements) || JSON.stringify(executed.constraints) !== JSON.stringify(result.plan.constraints))
      ctx.addIssue({ code: "custom", message: "Plan selections, placements or constraints differ from execution." });
  } catch { ctx.addIssue({ code: "custom", message: "Room tools violate layout or protection rules." }); }
});
export type DesignResult = z.infer<typeof resultSchema>;
