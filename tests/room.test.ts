import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultRoom, alternateRoom, roomSchema } from "../lib/room/state";
import { executeTools, diffToTools } from "../lib/room/tools";
test("a valid plan transforms the room and preserves fixed state", () => {
  const next = executeTools(defaultRoom, [
    { tool: "set_bedding", value: "sage_moss" },
    { tool: "set_lighting_temperature", value: 2200 },
    { tool: "add_decor", slot: "shelf", assetId: "sculpture" },
  ]);
  assert.equal(next.bedding, "sage_moss");
  assert.equal(next.lightingTemperature, 2200);
  assert.equal(next.decor.shelf, "sculpture");
  assert.equal(next.bedFrame, defaultRoom.bedFrame);
  assert.equal(defaultRoom.decor.shelf, "ceramic_vase");
});
test("invalid calls reject the entire plan without modifying its input", () => {
  for (const bad of [
    { tool: "set_rug", value: "https://evil.test/model.glb" },
    { tool: "set_lighting_intensity", value: 99 },
    { tool: "move_wall", value: 2 },
    { tool: "set_wall_color", value: "red" },
    { tool: "set_bedding", value: "sage_moss", code: "execute()" },
  ]) {
    const before = structuredClone(defaultRoom);
    assert.throws(() =>
      executeTools(before, [
        { tool: "set_bedding", value: "rust_terracotta" },
        bad,
      ]),
    );
    assert.deepEqual(before, defaultRoom);
  }
});
test("state diffs exactly reconstruct a target including decor removals", () => {
  const target = {
    ...alternateRoom,
    decor: { ...alternateRoom.decor, floor: null },
  };
  assert.deepEqual(
    executeTools(defaultRoom, diffToTools(defaultRoom, target)),
    target,
  );
  assert.throws(() => roomSchema.parse({ ...target, camera: { x: 10 } }));
});
test("replacing art or textiles clears stale generated surfaces but explicit texture intent survives diffs", () => {
  const initial = roomSchema.parse({
    ...defaultRoom,
    textures: { artwork: "/textures/artwork-minimal-line.svg", rug: "/textures/rug-cream-wool.svg", bedding: "/textures/bedding-ivory-linen.svg" },
  });
  const replaced = executeTools(initial, [
    { tool: "set_artwork", value: "geometric_02" },
    { tool: "set_rug", value: "dark_textured" },
    { tool: "set_bedding", value: "sage_moss" },
  ]);
  assert.deepEqual(replaced.textures, { artwork: null, rug: null, bedding: null });
  assert.equal(initial.textures.artwork, "/textures/artwork-minimal-line.svg");
  const explicit = { ...replaced, textures: initial.textures };
  assert.deepEqual(executeTools(initial, diffToTools(initial, explicit)), explicit);
});
