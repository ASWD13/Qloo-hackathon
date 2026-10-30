import { constraintsSchema, type RoomState, type RoomConstraints } from "./state";
import { catalogForAgent } from "@/lib/assets/catalog";

export function lockedValue(room: RoomState, field: string): unknown {
  if (field.endsWith("Placement")) return room.placements[field.slice(0, -9) as keyof RoomState["placements"]];
  return field.split(".").reduce<unknown>((value, key) =>
    value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined, room);
}

export function mergeConstraints(...values: RoomConstraints[]): RoomConstraints {
  return constraintsSchema.parse({
    locked: [...new Set(values.flatMap((value) => value.locked))],
    forbidden: [...new Set(values.flatMap((value) => value.forbidden))],
    preferences: [...new Set(values.flatMap((value) => value.preferences))],
  });
}

const assetPolicies = Object.fromEntries(Object.values(catalogForAgent).flat().map((asset) => [asset.id, asset]));
const furnitureFields = ["bedType", "bedFrame", "nightstandLeft", "nightstandRight", "chair", "storage", "secondary"] as const;
function isSaturatedColor(hex: string): boolean {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  const chroma = Math.max(...rgb) - Math.min(...rgb);
  return chroma > 80 && chroma / Math.max(...rgb) > 0.4;
}

/** Execution invariant: neither a tool nor a model can remove an existing protection. */
export function assertRoomConstraints(before: RoomState, after: RoomState): void {
  for (const key of before.constraints.locked) {
    if (!after.constraints.locked.includes(key) || JSON.stringify(lockedValue(before, key)) !== JSON.stringify(lockedValue(after, key)))
      throw new Error(`Locked room element: ${key}. Unlock it before changing it.`);
  }
  for (const slot of ["artwork", "bedding", "rug"] as const)
    if (before.constraints.locked.includes(slot) && before.textures[slot] !== after.textures[slot]) throw new Error(`Locked surface texture: ${slot}.`);
  for (const exclusion of before.constraints.forbidden)
    if (!after.constraints.forbidden.includes(exclusion)) throw new Error(`Preserved exclusion: ${exclusion}.`);
  for (const exclusion of after.constraints.forbidden) {
    if (exclusion === "plants" && Object.values(after.decor).includes("plant")) throw new Error("Plants are excluded.");
    if (exclusion === "darkFurniture" && furnitureFields.some((field) => assetPolicies[after[field]]?.dark)) throw new Error("Dark furniture is excluded.");
    if (exclusion === "glossyFurniture" && [...furnitureFields.map((field) => after[field]), after.tableLamp, after.floorLamp].some((id) => assetPolicies[id]?.glossy)) throw new Error("Glossy furniture is excluded.");
    if (exclusion === "brightColors" && ([after.bedding, after.rug, after.chair, after.tableLamp, after.nightstandLeft, after.nightstandRight].some((id) => assetPolicies[id]?.saturated) || isSaturatedColor(after.wallColor) || isSaturatedColor(after.accentColor))) throw new Error("Bright colors are excluded.");
    if (exclusion === "floorFurniture" && (after.chair !== "none" || after.secondary !== "none" || !["none", "wall_shelf"].includes(after.storage) || after.floorLamp !== "none" || after.decor.floor !== null)) throw new Error("Additional floor furniture is excluded.");
  }
}

const lockLanguage: Record<string, RegExp> = {
  wallColor: /\bwall|paint/, accentColor: /\bwall|paint/, floor: /\bfloor/,
  bedType: /\bbed\b/, bedFrame: /\bbed\b|frame/, bedPlacement: /\bbed\b/,
  bedding: /bedding|linen|duvet/, "textures.bedding": /bedding|linen|duvet/,
  nightstandLeft: /bedside|nightstand/, nightstandRight: /bedside|nightstand/,
  tableLamp: /lamp|lighting/, floorLamp: /lamp|lighting/, floorLampPlacement: /lamp|lighting/,
  lightingTemperature: /lighting|temperature/, lightingIntensity: /lighting|brightness/,
  chair: /chair|seating/, chairPlacement: /chair|seating/,
  rug: /\brug\b/, rugSize: /\brug\b/, "textures.rug": /\brug\b/,
  artwork: /\bart\b|artwork/, "textures.artwork": /\bart\b|artwork/,
  storage: /storage|shelving|dresser|cabinet/, storagePlacement: /storage|shelving|dresser|cabinet/,
  secondary: /desk|console|bench|table/, deskPlacement: /desk|console|bench|table/,
  decor: /decor|objects/, "decor.bedside": /bedside decor/, "decor.shelf": /shelf decor/, "decor.floor": /floor decor/,
  textures: /textures|patterns/,
};
const exclusionLanguage: Record<RoomConstraints["forbidden"][number], RegExp> = {
  plants: /plants?|greenery|vegetation/, darkFurniture: /dark|black|ebony/,
  brightColors: /bright|vibrant|neon|saturat/, glossyFurniture: /gloss|shiny|polish|reflective/,
  floorFurniture: /floor furniture|ground furniture|clear.*floor/,
};

/** Common explicit directives are bound independently of provider prose. Gemini supplies broader interpretation. */
export function parseConstraints(text: string, current: RoomState, inferred?: RoomConstraints): RoomConstraints {
  const source = text.toLowerCase().replaceAll("’", "'");
  const next = constraintsSchema.parse({ locked: [], forbidden: [], preferences: [] });
  const lock = (...fields: RoomConstraints["locked"]) => next.locked.push(...fields);
  if (/keep (?:the |my )?walls? (?:white|unchanged|as (?:it|they) (?:is|are))|don'?t (?:change|repaint|paint).*walls?|don'?t repaint|do not repaint|rent(?:ing)?.*(?:not|no|don'?t).*paint/.test(source)) lock("wallColor", "accentColor");
  if (/don'?t move (?:the |my )?bed|do not move (?:the |my )?bed|keep (?:the |my )?bed (?:position|placement|where)/.test(source)) lock("bedPlacement");
  if (/lock (?:the |my )?bed\b|keep (?:the |my )?bed unchanged/.test(source)) lock("bedType", "bedFrame", "bedPlacement");
  if (/keep (?:the |my )?(?:chair|seat)|don'?t (?:change|replace) (?:the |my )?chair/.test(source)) lock("chair", "chairPlacement");
  if (/keep (?:the |my )?rug|don'?t (?:change|replace) (?:the |my )?rug/.test(source)) lock("rug", "rugSize", "textures.rug");
  if (/keep (?:the |my )?(?:art|artwork)|don'?t (?:change|replace) (?:the |my )?art/.test(source)) lock("artwork", "textures.artwork");
  if (/keep (?:the |my )?bedding|don'?t (?:change|replace) (?:the |my )?bedding/.test(source)) lock("bedding", "textures.bedding");
  if (/keep (?:the |my )?lighting|don'?t change (?:the |my )?lighting/.test(source)) lock("lightingTemperature", "lightingIntensity", "tableLamp", "floorLamp");
  if (/keep (?:the |my )?(?:storage|dresser)|don'?t (?:change|replace) (?:the |my )?storage/.test(source)) lock("storage", "storagePlacement");
  if (/no plants?|without plants?|remove (?:the |all )?plants?|don'?t (?:add|want|use).*plants?/.test(source)) next.forbidden.push("plants");
  if (/no dark furniture|without dark furniture|don'?t.*dark furniture/.test(source)) next.forbidden.push("darkFurniture");
  if (/no bright colou?rs?|without bright colou?rs?|don'?t.*bright colou?rs?/.test(source)) next.forbidden.push("brightColors");
  if (/hate glossy|no gloss|matte (?:furniture|finishes)|without glossy/.test(source)) next.forbidden.push("glossyFurniture");
  if (/minimal floor furniture|no floor furniture|clear (?:the )?floor/.test(source)) next.forbidden.push("floorFurniture");
  if (/low[- ](?:lying|profile)|(?:bed.*lower)|(?:lower.*bed)|low (?:platform )?bed|platform bed/.test(source)) next.preferences.push("lowBed");
  if (/warm(?:er)? (?:lighting|light)|warm but sparse|keep it warm/.test(source)) next.preferences.push("warmLighting");
  if (/minimal|sparse|uncluttered/.test(source) && !/less minimal/.test(source)) next.preferences.push("minimal");
  if (/reading (?:corner|nook)/.test(source)) next.preferences.push("readingCorner");
  if (/more storage|add.*storage/.test(source)) next.preferences.push("moreStorage");
  if (/less symmetr|asymmetr/.test(source)) next.preferences.push("asymmetry");
  if (/lived[- ]in|less minimal|more layered/.test(source)) next.preferences.push("livedIn");
  if (/japanese caf|natural materials|jute|wood and linen/.test(source)) next.preferences.push("naturalMaterials");
  // Broader Gemini interpretations need matching user-language evidence and polarity.
  // This rejects enum-dumping (e.g. inventing "no floor furniture" for a reading corner).
  for (const clause of source.split(/[.;,\n]|\bbut\b/)) {
    const preserved = clause.match(/\b(?:keep|preserve|retain|leave|lock)\s+(.+)/)?.[1]
      ?? clause.match(/(?:don'?t|do not|never)\s+(?:move|change|replace|paint|repaint)\s+(.+)/)?.[1];
    const placementOnly = /(?:don'?t|do not|never)\s+move\b|\b(?:position|placement)\b/.test(clause);
    if (preserved) for (const field of inferred?.locked ?? [])
      if ((!placementOnly || field.endsWith("Placement")) && lockLanguage[field]?.test(preserved)) next.locked.push(field);
    if (/\b(?:no|not|without|avoid|hate|loathe|exclude)\b|don'?t/.test(clause))
      for (const rule of inferred?.forbidden ?? []) if (exclusionLanguage[rule].test(clause)) next.forbidden.push(rule);
  }
  return mergeConstraints(current.constraints, next);
}

/** A refinement's positive edit scope is separate from persistent locks. */
export function refinementScope(instruction: string): Set<string> | undefined {
  const source = instruction.toLowerCase();
  const scope = new Set<string>();
  if (/outside.*(?:taste|normal)|experimental|further/.test(source)) return new Set(["artwork", "bedding", "rug", "decor", "textures.artwork", "textures.bedding", "textures.rug"]);
  if (/bed/.test(source) && !/bedside/.test(source)) {
    if (/move|closer|push/.test(source)) scope.add("bedPlacement");
    if (/low|lower|platform|upholster|wood|metal|floating|replace|hate/.test(source)) scope.add("bedType");
  }
  if (/chair|seat/.test(source)) scope.add(/move|near|closer/.test(source) ? "chairPlacement" : "chair");
  if (/rug/.test(source)) scope.add("rug");
  if (/lighting|light warmer|warm it|warmer|cooler/.test(source)) scope.add("lightingTemperature");
  if (/warmer|cooler/.test(source) && !/lighting|only|everything/.test(source)) scope.add("wallColor");
  if (/reading (?:corner|nook)/.test(source)) ["chair", "chairPlacement", "floorLamp", "floorLampPlacement"].forEach((key) => scope.add(key));
  if (/bedside|nightstand/.test(source)) ["nightstandLeft", "nightstandRight", "tableLamp"].forEach((key) => scope.add(key));
  if (/lamp/.test(source) && !/reading/.test(source)) scope.add(/floor lamp/.test(source) ? "floorLamp" : "tableLamp");
  if (/storage|dresser|cabinet|shel(?:f|ves)|clothing rail/.test(source)) ["storage", "storagePlacement"].forEach((key) => scope.add(key));
  if (/desk|console|bench|ottoman|side table/.test(source)) ["secondary", "deskPlacement"].forEach((key) => scope.add(key));
  if (/wall/.test(source)) ["wallColor", "accentColor"].forEach((key) => scope.add(key));
  if (/plant|decor|lived[- ]in|layered|minimal|sparse/.test(source)) scope.add("decor");
  if (/playful|bolder/.test(source)) ["accentColor", "artwork", "tableLamp"].forEach((key) => scope.add(key));
  return scope.size ? scope : undefined;
}

function preserveField(target: RoomState, current: RoomState, field: string) {
  if (field.endsWith("Placement")) {
    const slot = field.slice(0, -9) as keyof RoomState["placements"];
    Reflect.set(target.placements, slot, current.placements[slot]);
  } else if (field.includes(".")) {
    const [group, key] = field.split(".");
    Reflect.set(Reflect.get(target, group), key, structuredClone(lockedValue(current, field)));
  } else Reflect.set(target, field, structuredClone(lockedValue(current, field)));
}

export function applyDesignInstructions(current: RoomState, proposed: RoomState, text: string, refinement = false): RoomState {
  const target = structuredClone(proposed);
  const source = text.toLowerCase().replaceAll("’", "'");
  // A model may propose design choices, but cannot invent permanent user restrictions.
  target.constraints = parseConstraints(text, current, proposed.constraints);
  if (refinement) target.constraints.preferences = current.constraints.preferences;
  for (const field of target.constraints.locked) {
    if ((field === "wallColor" || field === "accentColor") && /keep (?:the |my )?walls? white/.test(source)) continue;
    preserveField(target, current, field);
  }
  if (refinement) {
    const scope = refinementScope(text);
    if (scope) {
      for (const key of Object.keys(current)) {
        if (["constraints", "placements", "textures"].includes(key)) continue;
        if (!scope.has(key)) preserveField(target, current, key);
      }
      for (const slot of Object.keys(current.placements))
        if (!scope.has(slot + "Placement")) preserveField(target, current, slot + "Placement");
      for (const slot of Object.keys(current.textures))
        if (!scope.has("textures." + slot)) preserveField(target, current, "textures." + slot);
    }
  }
  if (/low[- ](?:lying|profile)|(?:bed.*lower)|(?:lower.*bed)|low (?:platform )?bed|platform bed/.test(source)) target.bedType = "platform_low";
  if (/upholstered bed/.test(source)) target.bedType = "upholstered";
  if (/wood(?:en)? (?:frame|bed)/.test(source)) target.bedType = "wood_frame";
  if (/metal (?:frame|bed)/.test(source)) target.bedType = "metal_frame";
  if (/floating (?:platform|bed)/.test(source)) target.bedType = "floating_platform";
  if (/keep (?:the |my )?walls? white/.test(source)) { target.wallColor = "#ffffff"; target.accentColor = "#ffffff"; }
  if (/no chair|without (?:a )?chair|remove (?:the |my )?chair/.test(source)) target.chair = "none";
  if (/no rug|without (?:a )?rug|remove (?:the |my )?rug/.test(source)) target.rug = "none";
  if (/no bedside|without bedside|no nightstand/.test(source)) { target.nightstandLeft = "none"; target.nightstandRight = "none"; target.tableLamp = "none"; target.decor.bedside = null; }
  if (/warm(?:er)? (?:lighting|light)|warm but sparse|keep it warm/.test(source)) target.lightingTemperature = refinement ? Math.max(2200, current.lightingTemperature - 400) : 2700;
  if (/cooler/.test(source)) target.lightingTemperature = Math.min(6500, current.lightingTemperature + 500);
  if (/reading (?:corner|nook)/.test(source)) {
    target.chair = "upholstered_low"; target.placements.chair = "window_reading";
    target.floorLamp = "sculptural_paper"; target.placements.floorLamp = "window_side";
  }
  if (/move.*(?:chair|seat).*(?:window)|(?:chair|seat).*near (?:the )?window/.test(source)) target.placements.chair = "window_reading";
  if (/bed.*(?:closer to|toward|near).*window/.test(source)) target.placements.bed = "back_left";
  if (/less symmetr|asymmetr/.test(source)) { target.nightstandLeft = "none"; target.tableLamp = "none"; target.decor.bedside = null; }
  if (/minimal|sparse/.test(source) && !/less minimal/.test(source)) target.decor = { bedside: null, shelf: target.decor.shelf === "plant" ? null : target.decor.shelf, floor: null };
  if (/lived[- ]in|less minimal|more layered/.test(source)) target.decor = { ...target.decor, shelf: "books_stack", bedside: target.nightstandRight === "none" ? null : "ceramic_vase" };
  if (/add (?:a )?bench/.test(source)) target.secondary = "bench";
  if (/small desk|add (?:a )?desk/.test(source)) target.secondary = "desk";
  if (/more storage/.test(source)) { target.storage = "dresser"; target.placements.storage = target.secondary !== "none" && target.placements.desk === "right_wall" ? "back_left" : "right_wall"; }
  for (const exclusion of target.constraints.forbidden) {
    if (exclusion === "plants") for (const slot of ["bedside", "shelf", "floor"] as const) if (target.decor[slot] === "plant") target.decor[slot] = null;
    if (exclusion === "darkFurniture") {
      for (const field of furnitureFields) if (assetPolicies[target[field]]?.dark) {
        const replacements = { bedType: "wood_frame", bedFrame: "light_oak", nightstandLeft: "minimal_oak", nightstandRight: "minimal_oak", chair: "upholstered_low", storage: "wall_shelf", secondary: "none" };
        Reflect.set(target, field, replacements[field]);
      }
    }
    if (exclusion === "glossyFurniture") {
      for (const field of [...furnitureFields, "tableLamp", "floorLamp"] as const) if (assetPolicies[target[field]]?.glossy) {
        const replacements = { bedType: "wood_frame", bedFrame: "light_oak", nightstandLeft: "minimal_oak", nightstandRight: "minimal_oak", chair: "wood_lounge", storage: "wall_shelf", secondary: "none", tableLamp: "paper_lantern", floorLamp: "sculptural_paper" };
        Reflect.set(target, field, replacements[field]);
      }
    }
    if (exclusion === "brightColors") {
      if (isSaturatedColor(target.wallColor)) target.wallColor = "#e6e2d5";
      if (isSaturatedColor(target.accentColor)) target.accentColor = "#8e9b73";
      for (const field of ["bedding", "rug", "chair", "tableLamp", "nightstandLeft", "nightstandRight"] as const) if (assetPolicies[target[field]]?.saturated) {
        const replacements = { bedding: "linen_ivory", rug: "cream_wool", chair: "upholstered_low", tableLamp: "paper_lantern", nightstandLeft: "minimal_oak", nightstandRight: "minimal_oak" };
        Reflect.set(target, field, replacements[field]);
      }
    }
    if (exclusion === "floorFurniture") { target.chair = "none"; target.secondary = "none"; target.storage = target.storage === "none" ? "none" : "wall_shelf"; target.floorLamp = "none"; target.decor.floor = null; }
  }
  // The user can introduce a lock with an initial value; an existing lock always wins.
  for (const field of current.constraints.locked) preserveField(target, current, field);
  for (const slot of ["artwork", "rug", "bedding"] as const) {
    if (current.constraints.locked.includes(slot)) target.textures[slot] = current.textures[slot];
    else if (target[slot] !== current[slot] && target.textures[slot] === current.textures[slot]) target.textures[slot] = null;
  }
  assertRoomConstraints(current, target);
  return target;
}
