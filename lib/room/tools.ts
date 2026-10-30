import { z } from "zod";
import { choices, label } from "@/lib/assets/catalog";
import { textureSlots, textureValueSchema } from "@/lib/assets/textures";
import { roomSchema, hexColor, constraintsSchema, type RoomState } from "./state";
import { assertValidLayout, placementChoices } from "./anchors";
import { assertRoomConstraints } from "./constraints";
const slotSchema = z.enum(["bedside", "shelf", "floor"]);
export const toolSchema = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("set_wall_color"), value: hexColor }).strict(),
  z.object({ tool: z.literal("set_accent_palette"), value: hexColor }).strict(),
  z.object({ tool: z.literal("set_floor_material"), value: z.enum(choices.floor) }).strict(),
  z.object({ tool: z.literal("set_bed_type"), value: z.enum(choices.bedType) }).strict(),
  z.object({ tool: z.literal("set_bed_frame"), value: z.enum(choices.bedFrame) }).strict(),
  z.object({ tool: z.literal("set_bedding"), value: z.enum(choices.bedding) }).strict(),
  z.object({ tool: z.literal("set_rug"), value: z.enum(choices.rug) }).strict(),
  z.object({ tool: z.literal("set_rug_size"), value: z.enum(choices.rugSize) }).strict(),
  z.object({ tool: z.literal("set_nightstand_left"), value: z.enum(choices.nightstand) }).strict(),
  z.object({ tool: z.literal("set_nightstand_right"), value: z.enum(choices.nightstand) }).strict(),
  z.object({ tool: z.literal("set_table_lamp"), value: z.enum(choices.tableLamp) }).strict(),
  z.object({ tool: z.literal("set_floor_lamp"), value: z.enum(choices.floorLamp) }).strict(),
  z.object({ tool: z.literal("set_chair"), value: z.enum(choices.chair) }).strict(),
  z.object({ tool: z.literal("set_storage"), value: z.enum(choices.storage) }).strict(),
  z.object({ tool: z.literal("set_secondary"), value: z.enum(choices.secondary) }).strict(),
  z.object({ tool: z.literal("set_artwork"), value: z.enum(choices.artwork) }).strict(),
  z.object({ tool: z.literal("set_lighting_temperature"), value: z.number().int().min(2200).max(6500) }).strict(),
  z.object({ tool: z.literal("set_lighting_intensity"), value: z.number().min(0.2).max(1.5) }).strict(),
  z.object({ tool: z.literal("set_constraints"), value: constraintsSchema }).strict(),
  z.object({ tool: z.literal("set_texture"), slot: z.enum(textureSlots), value: textureValueSchema.nullable() }).strict(),
  z.object({ tool: z.literal("move_furniture"), slot: z.enum(["bed", "chair", "desk", "floorLamp", "storage"]), placement_id: z.enum(["back_center", "back_left", "back_right", "window_reading", "front_right", "front_left", "right_wall", "under_window", "window_side"]) }).strict().refine((call) => (placementChoices[call.slot] as readonly string[]).includes(call.placement_id), "Placement is not valid for this furniture slot"),
  z.object({ tool: z.literal("add_decor"), slot: slotSchema, assetId: z.enum(choices.decor) }).strict(),
  z.object({ tool: z.literal("remove_decor"), slot: slotSchema }).strict(),
  z.object({ tool: z.literal("finish_design") }).strict(),
]);
export const planSchema = z.array(toolSchema).min(1).max(64);
export type RoomTool = z.infer<typeof toolSchema>;
export const fieldTools = {
  wallColor: "set_wall_color", accentColor: "set_accent_palette", floor: "set_floor_material", bedType: "set_bed_type", bedFrame: "set_bed_frame", bedding: "set_bedding", rug: "set_rug", rugSize: "set_rug_size", nightstandLeft: "set_nightstand_left", nightstandRight: "set_nightstand_right", tableLamp: "set_table_lamp", floorLamp: "set_floor_lamp", chair: "set_chair", storage: "set_storage", secondary: "set_secondary", artwork: "set_artwork", lightingTemperature: "set_lighting_temperature", lightingIntensity: "set_lighting_intensity",
} as const;
const toolFields = Object.fromEntries(Object.entries(fieldTools).map(([field, tool]) => [tool, field]));
export function executeTools(current: RoomState, input: unknown): RoomState {
  const tools = planSchema.parse(input);
  const before = roomSchema.parse(current);
  const next = roomSchema.parse(current);
  for (const call of tools) {
    if (call.tool === "add_decor") next.decor[call.slot] = call.assetId;
    else if (call.tool === "remove_decor") next.decor[call.slot] = null;
    else if (call.tool === "set_texture") next.textures[call.slot] = call.value;
    else if (call.tool === "move_furniture") Reflect.set(next.placements, call.slot, call.placement_id);
    else if (call.tool === "set_constraints") {
      for (const key of ["locked", "forbidden"] as const) {
        if (before.constraints[key].some((value) => !(call.value[key] as readonly string[]).includes(value))) throw new Error("AI tools cannot remove existing user constraints");
      }
      next.constraints = call.value;
    } else if ("value" in call) {
      const field = toolFields[call.tool];
      if ((field === "artwork" || field === "rug" || field === "bedding") && next[field] !== call.value) next.textures[field] = null;
      Reflect.set(next, field, call.value);
    }
  }
  const validated = roomSchema.parse(next);
  assertRoomConstraints(before, validated);
  assertValidLayout(validated);
  return validated;
}
export function diffToTools(before: RoomState, after: RoomState): RoomTool[] {
  const calls: unknown[] = [];
  for (const [field, tool] of Object.entries(fieldTools)) {
    const key = field as keyof typeof fieldTools;
    if (before[key] !== after[key]) calls.push({ tool, value: after[key] });
  }
  for (const slot of ["bedside", "shelf", "floor"] as const) if (before.decor[slot] !== after.decor[slot]) calls.push(after.decor[slot] ? { tool: "add_decor", slot, assetId: after.decor[slot] } : { tool: "remove_decor", slot });
  for (const slot of Object.keys(placementChoices) as (keyof typeof placementChoices)[]) if (before.placements[slot] !== after.placements[slot]) calls.push({ tool: "move_furniture", slot, placement_id: after.placements[slot] });
  for (const slot of textureSlots) if (before.textures[slot] !== after.textures[slot] || (before[slot] !== after[slot] && after.textures[slot] !== null)) calls.push({ tool: "set_texture", slot, value: after.textures[slot] });
  if (JSON.stringify(before.constraints) !== JSON.stringify(after.constraints)) calls.push({ tool: "set_constraints", value: after.constraints });
  return planSchema.parse(calls.length ? calls : [{ tool: "finish_design" }]);
}
export function describeTool(call: RoomTool) {
  if (call.tool === "move_furniture") return `${label(call.slot)} placement → ${label(call.placement_id)}`;
  if (call.tool === "set_constraints") return `Constraints → ${call.value.locked.length} locked, ${call.value.forbidden.length} exclusions, ${call.value.preferences.length} preferences`;
  if (call.tool === "set_texture") return `${label(call.slot)} texture → ${call.value ? "local texture" : "catalog default"}`;
  if ("value" in call) return `${label(toolFields[call.tool] ?? call.tool)} → ${typeof call.value === "string" ? (call.value.startsWith("#") ? call.value.toUpperCase() : label(call.value)) : call.value}${call.tool === "set_lighting_temperature" ? " K" : ""}`;
  if (call.tool === "add_decor") return `${label(call.slot)} decor → ${label(call.assetId)}`;
  if (call.tool === "remove_decor") return `${label(call.slot)} decor removed`;
  return "Design complete";
}
