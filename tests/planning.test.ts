import { test } from "node:test";
import assert from "node:assert/strict";
import { MockPlanner, LiveGemini } from "../lib/gemini/adapter";
import { MockQloo, LiveQloo } from "../lib/qloo/adapter";
import { profiles } from "../lib/agent/profiles";
import { defaultRoom } from "../lib/room/state";
import { executeTools } from "../lib/room/tools";
import { commit, undo, redo } from "../lib/room/history";
import { resultSchema } from "../lib/agent/plan";
const taste = profiles[0].taste;
test("warm refinement honors furniture preservation and rug-only honors every other field", async () => {
  const planner = new MockPlanner();
  const input = {
    taste,
    context: await new MockQloo().context(taste),
    adjacency: 55,
    current: defaultRoom,
  };
  const plan = await planner.plan({
    ...input,
    instruction: "Make it warmer but keep the same furniture",
  });
  const warm = executeTools(defaultRoom, plan.tools);
  assert.equal(warm.tableLamp, defaultRoom.tableLamp);
  assert.equal(warm.chair, defaultRoom.chair);
  assert.equal(warm.bedFrame, defaultRoom.bedFrame);
  assert.ok(warm.lightingTemperature < defaultRoom.lightingTemperature);
  const rug = executeTools(
    defaultRoom,
    (
      await planner.plan({
        ...input,
        instruction: "Keep everything except the rug",
      })
    ).tools,
  );
  assert.notEqual(rug.rug, defaultRoom.rug);
  assert.deepEqual({ ...rug, rug: defaultRoom.rug }, defaultRoom);
});
test("undo and redo restore metadata and branching discards obsolete future", () => {
  const first = { room: "neutral", explanation: "neutral" };
  const second = { room: "warm", explanation: "warm" };
  const history = commit({ past: [], present: first, future: [] }, second);
  assert.deepEqual(undo(history).present, first);
  assert.deepEqual(redo(undo(history)).present, second);
  assert.deepEqual(
    commit(undo(history), { room: "cool", explanation: "cool" }).future,
    [],
  );
});
test("Gemini incomplete or illegal plans never reach room execution", async () => {
  for (const envelope of [
    {
      candidates: [
        { finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } },
      ],
    },
    {
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  tools: [{ tool: "move_wall", value: 2 }],
                }),
              },
            ],
          },
        },
      ],
    },
  ]) {
    const provider = new LiveGemini("test", "gemini-2.5-flash", async () =>
      Response.json(envelope),
    );
    await assert.rejects(() =>
      provider.plan({
        taste,
        context: {
          source: "omitted",
          entities: [],
          recommendations: [],
          unresolved: [],
          warnings: [],
        },
        adjacency: 55,
        current: defaultRoom,
      }),
    );
  }
});
test("Qloo ambiguity and failed calls do not fabricate cultural entities", async () => {
  const provider = new LiveQloo("test", "https://api.qloo.com", async () =>
    Response.json({
      success: true,
      results: [
        { entity_id: "a", name: "Radiohead" },
        { entity_id: "b", name: "Radiohead" },
      ],
    }),
  );
  const context = await provider.context({
    music: ["Radiohead"],
    film: [],
    brands: [],
    wildcard: "",
  });
  assert.equal(context.source, "unavailable");
  assert.deepEqual(context.entities, []);
  assert.deepEqual(context.unresolved, ["Radiohead"]);
  assert.throws(() => new LiveQloo("test", "https://attacker.test"));
});
test("non-Latin names are not collapsed into the same entity", async () => {
  const provider = new LiveQloo("test", "https://api.qloo.com", async () =>
    Response.json({
      success: true,
      results: [{ entity_id: "wrong", name: "宇多田ヒカル" }],
    }),
  );
  const context = await provider.context({
    music: ["坂本龍一"],
    film: [],
    brands: [],
    wildcard: "",
  });
  assert.equal(context.source, "unavailable");
  assert.deepEqual(context.entities, []);
  assert.deepEqual(context.unresolved, ["坂本龍一"]);
});
test("a valid-looking result cannot claim a room different from its executed tools", async () => {
  const context = await new MockQloo().context(taste);
  const plan = await new MockPlanner().plan({
    taste,
    context,
    adjacency: 55,
    current: defaultRoom,
  });
  const room = executeTools(defaultRoom, plan.tools);
  assert.throws(() =>
    resultSchema.parse({
      plan,
      room: { ...room, wallColor: "#000001" },
      context,
      review: { performed: false, notes: [], appliedChanges: 0 },
      textureOutcomes: [],
      planner: "mock",
      model: "fixture",
      temperature: 0.6,
      durationMs: 1,
      baseline: defaultRoom,
    }),
  );
});
