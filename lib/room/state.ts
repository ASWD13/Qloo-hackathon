import { z } from "zod";
import { choices } from "@/lib/assets/catalog";
import { textureValueSchema } from "@/lib/assets/textures";
import { placementChoices } from "./anchors";
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const constraintLockFields = ["wallColor", "accentColor", "floor", "bedType", "bedFrame", "bedding", "nightstandLeft", "nightstandRight", "tableLamp", "floorLamp", "rug", "rugSize", "chair", "artwork", "storage", "secondary", "lightingTemperature", "lightingIntensity", "decor", "decor.bedside", "decor.shelf", "decor.floor", "textures", "textures.artwork", "textures.rug", "textures.bedding", "bedPlacement", "chairPlacement", "deskPlacement", "floorLampPlacement", "storagePlacement"] as const;
export const forbiddenValues = ["plants", "darkFurniture", "brightColors", "glossyFurniture", "floorFurniture"] as const;
export const preferenceValues = ["lowBed", "warmLighting", "minimal", "readingCorner", "moreStorage", "asymmetry", "livedIn", "naturalMaterials"] as const;
export const constraintsSchema = z.object({
  locked: z.array(z.enum(constraintLockFields)).max(constraintLockFields.length),
  forbidden: z.array(z.enum(forbiddenValues)).max(forbiddenValues.length),
  preferences: z.array(z.enum(preferenceValues)).max(preferenceValues.length),
}).strict();
export type RoomConstraints = z.infer<typeof constraintsSchema>;
export const placementsSchema = z.object({ bed: z.enum(placementChoices.bed), chair: z.enum(placementChoices.chair), desk: z.enum(placementChoices.desk), floorLamp: z.enum(placementChoices.floorLamp), storage: z.enum(placementChoices.storage) }).strict();
export const roomSchema = z.object({
  wallColor: hexColor, accentColor: hexColor, floor: z.enum(choices.floor), bedType: z.enum(choices.bedType), bedFrame: z.enum(choices.bedFrame), bedding: z.enum(choices.bedding),
  nightstandLeft: z.enum(choices.nightstand), nightstandRight: z.enum(choices.nightstand), tableLamp: z.enum(choices.tableLamp), floorLamp: z.enum(choices.floorLamp),
  rug: z.enum(choices.rug), rugSize: z.enum(choices.rugSize), chair: z.enum(choices.chair), artwork: z.enum(choices.artwork), storage: z.enum(choices.storage), secondary: z.enum(choices.secondary),
  placements: placementsSchema,
  constraints: constraintsSchema,
  textures: z.object({ artwork: textureValueSchema.nullable(), rug: textureValueSchema.nullable(), bedding: textureValueSchema.nullable() }).strict(),
  decor: z.object({ bedside: z.enum(choices.decor).nullable(), shelf: z.enum(choices.decor).nullable(), floor: z.enum(choices.decor).nullable() }).strict(),
  lightingTemperature: z.number().int().min(2200).max(6500), lightingIntensity: z.number().min(0.2).max(1.5),
}).strict();
export type RoomState = z.infer<typeof roomSchema>;
export const defaultRoom: RoomState = roomSchema.parse({
  wallColor: "#e6e2d5", accentColor: "#8e9b73", floor: "oak_light", bedType: "upholstered", bedFrame: "light_oak", bedding: "linen_ivory",
  nightstandLeft: "minimal_oak", nightstandRight: "minimal_oak", tableLamp: "paper_lantern", floorLamp: "none", rug: "cream_wool", rugSize: "large", chair: "wood_lounge", artwork: "abstract_01", storage: "none", secondary: "none",
  placements: { bed: "back_center", chair: "front_right", desk: "right_wall", floorLamp: "window_side", storage: "back_left" },
  constraints: { locked: [], forbidden: [], preferences: [] }, textures: { artwork: null, rug: null, bedding: null },
  decor: { bedside: "books_stack", shelf: "ceramic_vase", floor: "plant" }, lightingTemperature: 3200, lightingIntensity: 0.8,
});
export const alternateRoom: RoomState = roomSchema.parse({
  ...defaultRoom, wallColor: "#b5bfbd", accentColor: "#d46f44", floor: "walnut_planks", bedType: "metal_frame", bedFrame: "matte_black", bedding: "rust_terracotta", rug: "dark_textured", tableLamp: "chrome_mushroom", chair: "metal_modern", artwork: "geometric_02", lightingTemperature: 2800,
});
