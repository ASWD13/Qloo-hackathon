export const choices = {
  floor: ["oak_light", "walnut_planks", "pale_concrete"],
  bedType: ["platform_low", "upholstered", "wood_frame", "metal_frame", "floating_platform"],
  bedFrame: ["light_oak", "walnut", "matte_black", "painted_cream"],
  bedding: ["linen_ivory", "charcoal_layered", "sage_moss", "rust_terracotta", "monochrome_grey", "expressive_pattern"],
  nightstand: ["none", "minimal_oak", "walnut_block", "brushed_steel", "rounded_color", "sculptural_stone", "floating_shelf", "compact", "drawer"],
  tableLamp: ["none", "paper_lantern", "chrome_mushroom", "ceramic_dome", "globe", "industrial_metal", "playful_color", "bedside", "wall_sconce", "pendant", "directional"],
  floorLamp: ["none", "sculptural_paper", "arc", "slender_metal", "soft_globe"],
  rug: ["none", "cream_wool", "muted_geometric", "dark_textured", "moss_olive", "warm_rust", "expressive_graphic", "jute", "runner"],
  rugSize: ["large", "medium", "runner"],
  chair: ["none", "wood_lounge", "upholstered_low", "metal_modern", "colorful_sculptural", "beanbag", "bench", "ottoman"],
  storage: ["none", "open_shelf", "dresser", "low_cabinet", "wall_shelf", "clothing_rail"],
  secondary: ["none", "desk", "console", "bench", "side_table"],
  artwork: ["none", "abstract_01", "abstract_02", "abstract_03", "abstract_04", "geometric_01", "geometric_02", "editorial_01", "editorial_02", "minimal_01", "minimal_02", "illustration_01", "illustration_02"],
  decor: ["ceramic_vase", "sculpture", "books_stack", "plant", "small_lamp", "tray", "candle", "bowl", "magazines", "abstract_object"],
} as const;
export type Category = keyof typeof choices;
export const colors: Record<string, string> = {
  oak_light: "#c4a274", walnut_planks: "#78533c", pale_concrete: "#b9b9ae",
  light_oak: "#c5a274", walnut: "#624331", matte_black: "#292c29", painted_cream: "#e6dfce",
  linen_ivory: "#e8e0cb", charcoal_layered: "#424b4c", sage_moss: "#89957b", rust_terracotta: "#bb644b", monochrome_grey: "#aaaead", expressive_pattern: "#d7bc58",
  minimal_oak: "#c5a274", walnut_block: "#654c3c", brushed_steel: "#9fa9ac", rounded_color: "#b3bb61", sculptural_stone: "#d9d0be", floating_shelf: "#c5a274", compact: "#d6c6a6", drawer: "#866349",
  cream_wool: "#dfd6bd", muted_geometric: "#a0a38e", dark_textured: "#484b46", moss_olive: "#727d4e", warm_rust: "#b76745", expressive_graphic: "#6077a6", jute: "#b99c65", runner: "#b98b69",
  wood_lounge: "#936b46", upholstered_low: "#ddd0af", metal_modern: "#718b91", colorful_sculptural: "#c65b3d", beanbag: "#a3a67c", bench: "#9d7651", ottoman: "#c39479",
};
export function label(id: string) {
  return id.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
export type AssetMetadata = {
  id: string; name: string; style: string; form: string; material: string;
  weight: "light" | "medium" | "heavy"; height: "low" | "medium" | "tall";
  softness: "hard" | "soft"; color: string; placements: readonly string[];
  dark: boolean; glossy: boolean; saturated: boolean;
};
const categoryTraits: Record<Category, [string, string, string, AssetMetadata["height"]]> = {
  floor: ["architectural", "surface", "wood", "low"], bedType: ["contemporary", "bed", "wood", "medium"], bedFrame: ["contemporary", "finish", "wood", "low"], bedding: ["tactile", "textile", "linen", "low"],
  nightstand: ["minimal", "bedside", "wood", "low"], tableLamp: ["sculptural", "light", "ceramic", "medium"], floorLamp: ["sculptural", "light", "metal", "tall"], rug: ["tactile", "textile", "wool", "low"], rugSize: ["functional", "size", "textile", "low"], chair: ["contemporary", "seat", "wood", "medium"], storage: ["functional", "storage", "wood", "tall"], secondary: ["minimal", "table", "wood", "medium"], artwork: ["editorial", "wall_art", "paper", "medium"], decor: ["sculptural", "object", "ceramic", "low"],
};
const categoryPlacements: Partial<Record<Category, readonly string[]>> = {
  bedType: ["back_center", "back_left", "back_right"], nightstand: ["bed_attached_left", "bed_attached_right"],
  chair: ["window_reading", "front_right", "front_left"], floorLamp: ["window_side", "front_right"],
  secondary: ["right_wall", "front_left", "under_window"], storage: ["back_left", "right_wall", "front_right"],
  tableLamp: ["bedside_surface", "bedside_wall"], artwork: ["back_wall"], decor: ["bedside", "shelf", "floor"],
};
const assetForms: Record<string, string> = {
  platform_low: "low_slab", upholstered: "padded_channel_headboard", wood_frame: "slatted_frame", metal_frame: "tubular_frame", floating_platform: "recessed_plinth",
  wood_lounge: "open_armchair", upholstered_low: "cushioned_armchair", metal_modern: "tubular_sled_seat", colorful_sculptural: "pedestal_shell", beanbag: "rounded_floor_seat", bench: "backless_bench", ottoman: "round_pouf",
  minimal_oak: "open_bedside", walnut_block: "solid_block", brushed_steel: "open_metal_frame", rounded_color: "tapered_drum", sculptural_stone: "stacked_pedestal", floating_shelf: "wall_mounted", compact: "narrow_trestle", drawer: "drawer_box",
  open_shelf: "open_bookcase", dresser: "chest_of_drawers", low_cabinet: "two_door_cabinet", wall_shelf: "wall_mounted_shelves", clothing_rail: "open_frame", desk: "drawer_desk", console: "two_level_console", side_table: "round_pedestal",
  paper_lantern: "ribbed_lantern", chrome_mushroom: "hemisphere_dome", ceramic_dome: "ceramic_cone", globe: "spherical_light", industrial_metal: "angled_task_light", playful_color: "colored_cone", bedside: "traditional_shade", wall_sconce: "wall_mounted_globe", pendant: "hanging_cone", directional: "adjustable_task_light", sculptural_paper: "ribbed_column", arc: "arched_light", slender_metal: "directional_stem", soft_globe: "globe_stem",
};
function metadata(category: Category, id: string): AssetMetadata {
  const [style, form, baseMaterial, height] = categoryTraits[category];
  const metal = /metal|steel|chrome|rail|sconce|directional/.test(id);
  const soft = /upholstered|beanbag|ottoman|linen|wool|bedding|rug/.test(id + category);
  const material = metal ? "metal" : /paper|lantern/.test(id) ? "paper" : /stone|concrete/.test(id) ? "stone" : /jute/.test(id) ? "jute" : soft ? "textile" : baseMaterial;
  return {
    id, name: label(id), style: /sculptural|expressive|playful/.test(id) ? "expressive" : style,
    form: id === "none" ? "absent" : assetForms[id] ?? form,
    material: id === "none" ? "none" : material,
    weight: id === "none" || /floating|paper|compact|wall_shelf/.test(id) ? "light" : /dresser|stone|block|upholstered/.test(id) ? "heavy" : "medium",
    height: /low|platform|ottoman|beanbag|bench|cabinet/.test(id) ? "low" : height,
    softness: soft ? "soft" : "hard", color: colors[id] ?? (metal ? "#a7afb0" : "#dfd6bd"),
    placements: id === "wall_shelf" ? ["back_left", "right_wall"] : categoryPlacements[category] ?? ["fixed"],
    dark: ["walnut", "matte_black", "walnut_block", "charcoal_layered", "dark_textured"].includes(id),
    glossy: ["brushed_steel", "chrome_mushroom", "industrial_metal", "directional", "wall_sconce", "metal_modern", "metal_frame", "clothing_rail", "arc", "slender_metal"].includes(id),
    saturated: ["colorful_sculptural", "playful_color", "rust_terracotta", "expressive_pattern", "expressive_graphic", "warm_rust"].includes(id),
  };
}
export const catalogForAgent = Object.fromEntries(
  (Object.entries(choices) as [Category, readonly string[]][]).map(([category, ids]) => [category, ids.map((id) => metadata(category, id))]),
) as Record<Category, AssetMetadata[]>;
