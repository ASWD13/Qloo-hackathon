import { test } from "node:test";
import assert from "node:assert/strict";
import { MockPlanner } from "../lib/gemini/adapter";
import { MockQloo } from "../lib/qloo/adapter";
import { defaultRoom, roomSchema, type RoomState } from "../lib/room/state";
import { executeTools, diffToTools } from "../lib/room/tools";
import { applyDesignInstructions } from "../lib/room/constraints";
import { layoutIssues } from "../lib/room/anchors";
import { validateDesignPlan } from "../lib/agent/planning";

const taste = { music: ["Radiohead"], film: ["A24"], brands: ["Muji"], wildcard: "" };
async function design(wildcard: string, current: RoomState = defaultRoom, instruction?: string) {
  const selected = { ...taste, wildcard };
  const input = { taste: selected, context: await new MockQloo().context(selected), adjacency: 55, current, instruction };
  const plan = validateDesignPlan(input, await new MockPlanner().plan(input));
  return { plan, room: executeTools(current, plan.tools) };
}

test("Scenario A: low-lying bed is geometry, with warm lighting", async () => {
  const { room } = await design("I want a low-lying bed and warm lighting.");
  assert.equal(room.bedType, "platform_low");
  assert.ok(room.lightingTemperature <= 2800);
  assert.notEqual(room.bedType, defaultRoom.bedType);
  assert.ok(room.constraints.preferences.includes("lowBed"));
});
test("Scenario B: white walls persist while a reading corner occupies window anchors", async () => {
  const { room } = await design("Keep the walls white. Add a reading corner near the window.");
  assert.equal(room.wallColor, "#ffffff");
  assert.equal(room.accentColor, "#ffffff");
  assert.ok(room.constraints.locked.includes("wallColor"));
  assert.equal(room.placements.chair, "window_reading");
  assert.equal(room.placements.floorLamp, "window_side");
  assert.notEqual(room.chair, "none");
  assert.notEqual(room.floorLamp, "none");
  assert.deepEqual(layoutIssues(room), []);
  const next = await design("", room, "Make it warmer but keep everything else.");
  assert.equal(next.room.wallColor, "#ffffff");
  assert.equal(next.room.accentColor, "#ffffff");
});
test("Scenario C: no chair, no plants, and minimal decor are represented", async () => {
  const { room } = await design("No chair, no plants, keep it very minimal.");
  assert.equal(room.chair, "none");
  assert.ok(Object.values(room.decor).every((id) => id !== "plant"));
  assert.ok(Object.values(room.decor).filter(Boolean).length <= 1);
  assert.ok(room.constraints.forbidden.includes("plants"));
});
test("Scenario D: lower bed refinement changes only the bed geometry", async () => {
  const initial = (await design("")).room;
  const { room } = await design("", initial, "I hate the bed. Make it lower but keep everything else.");
  assert.equal(room.bedType, "platform_low");
  assert.deepEqual({ ...room, bedType: initial.bedType }, initial);
});
test("Scenario E: adjacent exploration changes art/textiles, not the whole room", async () => {
  const initial = (await design("")).room;
  const { room, plan } = await design("", initial, "Push the room a little further outside my normal taste.");
  const changed = Object.keys(room).filter((field) => JSON.stringify(Reflect.get(room, field)) !== JSON.stringify(Reflect.get(initial, field)));
  assert.ok(changed.includes("artwork"));
  assert.ok(changed.every((field) => ["artwork", "bedding", "rug", "decor", "textures"].includes(field)));
  assert.ok(changed.length <= 3);
  assert.match(plan.reasoning.adjacentTasteInfluence, /Björk/);
});
test("safe movement rejects collisions, invalid slot anchors and arbitrary transforms atomically", () => {
  const before = structuredClone(defaultRoom);
  assert.throws(() => executeTools(before, [{ tool: "move_furniture", slot: "bed", placement_id: "window_side" }]));
  assert.throws(() => executeTools(before, [{ tool: "move_furniture", slot: "chair", placement_id: "window_reading", x: 1 }]));
  assert.throws(() => executeTools(before, [{ tool: "move_furniture", slot: "bed", placement_id: "back_right" }]));
  const moved = executeTools(before, [{ tool: "move_furniture", slot: "bed", placement_id: "back_left" }]);
  assert.equal(moved.placements.bed, "back_left");
  assert.deepEqual(before, defaultRoom);
});
test("locks cannot be bypassed by tools, constraint replacement, or texture replacement", () => {
  const locked = roomSchema.parse({ ...defaultRoom, constraints: { ...defaultRoom.constraints, locked: ["bedType", "bedPlacement", "artwork"] } });
  for (const tools of [
    [{ tool: "set_bed_type", value: "metal_frame" }],
    [{ tool: "move_furniture", slot: "bed", placement_id: "back_left" }],
    [{ tool: "set_constraints", value: { locked: [], forbidden: [], preferences: [] } }, { tool: "set_bed_type", value: "metal_frame" }],
    [{ tool: "set_texture", slot: "artwork", value: "/textures/artwork-minimal-line.svg" }],
  ]) assert.throws(() => executeTools(locked, tools));
  assert.deepEqual(executeTools(locked, [{ tool: "set_lighting_temperature", value: 2700 }]).constraints, locked.constraints);
});
test("rental wall locks and material exclusions survive later refinements", async () => {
  const { room } = await design("I rent, so don't repaint. No dark furniture. I hate glossy furniture.");
  assert.equal(room.wallColor, defaultRoom.wallColor);
  assert.equal(room.accentColor, defaultRoom.accentColor);
  assert.ok(room.constraints.forbidden.includes("darkFurniture"));
  assert.ok(room.constraints.forbidden.includes("glossyFurniture"));
  assert.throws(() => executeTools(room, [{ tool: "set_bed_frame", value: "matte_black" }]));
  assert.throws(() => executeTools(room, [{ tool: "set_table_lamp", value: "chrome_mushroom" }]));
});
test("layout additions and removals reconstruct through tools without orphaned objects", async () => {
  const { room } = await design("No bedside tables. Add a bench. More storage.");
  assert.equal(room.nightstandLeft, "none");
  assert.equal(room.nightstandRight, "none");
  assert.equal(room.tableLamp, "none");
  assert.equal(room.decor.bedside, null);
  assert.equal(room.secondary, "bench");
  assert.equal(room.storage, "dresser");
  assert.deepEqual(executeTools(defaultRoom, diffToTools(defaultRoom, room)), room);
  assert.deepEqual(layoutIssues(room), []);
});
test("floor-furniture exclusions leave only essential bed and wall-mounted storage", () => {
  const room = applyDesignInstructions(defaultRoom, defaultRoom, "Minimal floor furniture, more storage.");
  assert.equal(room.chair, "none");
  assert.equal(room.secondary, "none");
  assert.equal(room.storage, "wall_shelf");
  assert.equal(room.floorLamp, "none");
  assert.equal(room.decor.floor, null);
});
test("model-invented exclusions and locks cannot erase an explicitly requested reading corner", () => {
  const proposed = roomSchema.parse({
    ...defaultRoom,
    constraints: {
      locked: ["bedType", "chair", "floorLamp"],
      forbidden: ["plants", "floorFurniture", "darkFurniture", "glossyFurniture"],
      preferences: ["minimal"],
    },
  });
  const room = applyDesignInstructions(defaultRoom, proposed, "Keep the walls white. Add a reading corner near the window.");
  assert.deepEqual(room.constraints.locked, ["wallColor", "accentColor"]);
  assert.deepEqual(room.constraints.forbidden, []);
  assert.equal(room.chair, "upholstered_low");
  assert.equal(room.floorLamp, "sculptural_paper");
});
test("Gemini's broader constraint interpretation is accepted only with matching source evidence", () => {
  const inferred = roomSchema.parse({ ...defaultRoom, constraints: {
    locked: ["floor", "bedType"], forbidden: ["plants", "glossyFurniture", "floorFurniture"], preferences: [],
  } });
  const room = applyDesignInstructions(defaultRoom, inferred, "Please leave the timber floor exactly as it is. Avoid greenery. I loathe shiny cabinets.");
  assert.deepEqual(room.constraints.locked, ["floor"]);
  assert.deepEqual(room.constraints.forbidden, ["plants", "glossyFurniture"]);
  assert.equal(room.decor.floor, null);
  assert.equal(room.chair, defaultRoom.chair);
});
test("a movement lock does not turn flexible bed geometry into a fixed element", () => {
  const inferred = roomSchema.parse({ ...defaultRoom, bedType: "metal_frame", constraints: {
    locked: ["bedType", "bedFrame", "bedPlacement"], forbidden: [], preferences: [],
  } });
  const room = applyDesignInstructions(defaultRoom, inferred, "Don't move the bed.");
  assert.deepEqual(room.constraints.locked, ["bedPlacement"]);
  assert.equal(room.bedType, "metal_frame");
  assert.equal(room.placements.bed, defaultRoom.placements.bed);
});
test("experimental proposals compile to three surfaces without changing unrelated decor", async () => {
  const selected = await design("");
  const initial = selected.room;
  const proposed = roomSchema.parse({ ...initial, artwork: "geometric_02", bedding: "expressive_pattern", rug: "expressive_graphic", decor: { ...initial.decor, shelf: "sculpture" } });
  const input = { taste, context: await new MockQloo().context(taste), adjacency: 75, current: initial, instruction: "Push the room a little further outside my normal taste." };
  const candidate = { ...selected.plan, assetSelections: { ...selected.plan.assetSelections, artwork: proposed.artwork, bedding: proposed.bedding, rug: proposed.rug }, tools: diffToTools(initial, proposed), generatedTextureRequests: [] };
  const result = executeTools(initial, validateDesignPlan(input, candidate).tools);
  assert.equal(result.artwork, "geometric_02");
  assert.equal(result.bedding, "expressive_pattern");
  assert.equal(result.rug, "expressive_graphic");
  assert.deepEqual(result.decor, initial.decor);
});
