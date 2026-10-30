import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LiveGemini,
  MockPlanner,
  type PlannerInput,
} from "../lib/gemini/adapter";
import { DesignError } from "../lib/agent/errors";
import { designPlanSchema, designProposalSchema, type DesignPlan } from "../lib/agent/plan";
import { profiles } from "../lib/agent/profiles";
import { defaultRoom } from "../lib/room/state";
import { executeTools } from "../lib/room/tools";

function input(): PlannerInput {
  return {
    taste: profiles[0].taste,
    context: {
      source: "omitted",
      entities: [],
      recommendations: [],
      unresolved: [],
      warnings: [],
    },
    adjacency: 55,
    current: structuredClone(defaultRoom),
  };
}
function proposalFor(plan: DesignPlan) {
  const room = executeTools(defaultRoom, plan.tools);
  const { tools: _tools, ...metadata } = plan;
  return designProposalSchema.parse({ ...metadata, surfaces: { wallColor: room.wallColor, accentColor: room.accentColor, lightingTemperature: room.lightingTemperature, lightingIntensity: room.lightingIntensity, decor: room.decor } });
}
function completed(plan: unknown): Response {
  const validPlan = designPlanSchema.safeParse(plan);
  if (validPlan.success) plan = proposalFor(validPlan.data);
  return Response.json({
    candidates: [
      { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(plan) }] } },
    ],
  });
}

test("invalid catalog selections and unsupported provider fields are repaired once", async () => {
  const original = input();
  const valid = await new MockPlanner().plan(original);
  const proposal = proposalFor(valid);
  for (const invalid of [
    { ...proposal, assetSelections: { ...proposal.assetSelections, bedType: "invented_provider_asset" } },
    { ...proposal, surfaces: { ...proposal.surfaces, decor: { ...proposal.surfaces.decor, shelf: "invented_provider_asset" } } },
    { ...proposal, tools: [{ tool: "invented_provider_tool", value: "invented_provider_asset" }] },
  ]) {
    const requests: string[] = [];
    const provider = new LiveGemini("test", undefined, async (_url, init) => {
      requests.push(String(init?.body));
      return completed(requests.length === 1 ? invalid : valid);
    });
    const result = await provider.plan(original);
    assert.deepEqual(result, valid);
    assert.deepEqual(executeTools(original.current, result.tools), executeTools(original.current, valid.tools));
    assert.equal(requests.length, 2);
    assert.ok(!requests[1].includes("invented_provider_asset"));
    assert.ok(!requests[1].includes("invented_provider_tool"));
    assert.deepEqual(original.current, defaultRoom);
  }
});

test("a second invalid design is rejected without remapping or changing the room", async () => {
  const original = input();
  const valid = await new MockPlanner().plan(original);
  const proposal = proposalFor(valid);
  let calls = 0;
  const provider = new LiveGemini("test", undefined, async () => {
    calls++;
    return completed({ ...proposal, assetSelections: { ...proposal.assetSelections, rug: "private-invalid-id" } });
  });
  await assert.rejects(() => provider.plan(original), (error: unknown) => {
    assert.ok(error instanceof DesignError);
    assert.equal(error.diagnostic.stage, "plan-validation");
    assert.equal(error.diagnostic.provider, "gemini");
    assert.equal(error.diagnostic.code, "INVALID_PLAN");
    assert.ok(error.diagnostic.issues?.some((issue) => issue.path === "assetSelections.rug"));
    assert.ok(!JSON.stringify(error.diagnostic).includes("private-invalid-id"));
    return true;
  });
  assert.equal(calls, 2);
  assert.deepEqual(original.current, defaultRoom);
});

test("non-JSON model text gets exactly one structured repair", async () => {
  const original = input();
  const valid = await new MockPlanner().plan(original);
  for (const repaired of [true, false]) {
    let calls = 0;
    const provider = new LiveGemini("test", undefined, async () => {
      calls++;
      return repaired && calls === 2
        ? completed(valid)
        : Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not-json-private-text" }] } }] });
    });
    if (repaired) assert.deepEqual(await provider.plan(original), valid);
    else await assert.rejects(() => provider.plan(original), (error: unknown) => {
      assert.ok(error instanceof DesignError);
      assert.equal(error.diagnostic.code, "INVALID_PLAN_JSON");
      assert.equal(error.diagnostic.stage, "plan-validation");
      assert.ok(!JSON.stringify(error.diagnostic).includes("not-json-private-text"));
      return true;
    });
    assert.equal(calls, 2);
  }
});

test("provider HTTP failures preserve status without leaking provider bodies or credentials", async () => {
  for (const status of [401, 403, 404]) {
    let calls = 0;
    const provider = new LiveGemini("private-key-marker", undefined, async () => {
      calls++;
      return Response.json({ error: "private-provider-body" }, { status });
    });
    await assert.rejects(() => provider.plan(input()), (error: unknown) => {
      assert.ok(error instanceof DesignError);
      assert.equal(error.diagnostic.stage, "design-planning");
      assert.equal(error.diagnostic.provider, "gemini");
      assert.equal(error.diagnostic.status, status);
      assert.equal(error.diagnostic.code, `HTTP_${status}`);
      assert.equal(error.diagnostic.retryable, false);
      assert.ok(!JSON.stringify(error.diagnostic).includes("private-"));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("a transient Gemini failure retries once and can recover", async () => {
  const original = input();
  const valid = await new MockPlanner().plan(original);
  let calls = 0;
  const provider = new LiveGemini("test", undefined, async (_url, init) => {
    calls++;
    assert.ok(init?.signal);
    return calls === 1 ? Response.json({}, { status: 503 }) : completed(valid);
  });
  assert.deepEqual(await provider.plan(original), valid);
  assert.equal(calls, 2);
});

test("persistent transient failure stays bounded and retains the last HTTP status", async () => {
  let calls = 0;
  const provider = new LiveGemini("test", undefined, async () => {
    calls++;
    return Response.json({ error: "private-body" }, { status: 503 });
  });
  await assert.rejects(() => provider.plan(input()), (error: unknown) => {
    assert.ok(error instanceof DesignError);
    assert.equal(error.diagnostic.status, 503);
    assert.equal(error.diagnostic.code, "HTTP_503");
    assert.equal(error.diagnostic.retryable, true);
    return true;
  });
  assert.equal(calls, 2);
});

test("blocked, missing and unfinished candidates retain safe reason codes without plan repair", async () => {
  const cases = [
    { payload: { promptFeedback: { blockReason: "SAFETY" } }, code: "BLOCKED_SAFETY" },
    { payload: {}, code: "NO_CANDIDATES" },
    { payload: { candidates: null }, code: "NO_CANDIDATES" },
    { payload: { candidates: [] }, code: "NO_CANDIDATES" },
    { payload: { candidates: [{ finishReason: "MAX_TOKENS", content: null }] }, code: "FINISH_MAX_TOKENS" },
    { payload: { candidates: [{ finishReason: "SAFETY" }] }, code: "FINISH_SAFETY" },
    { payload: { candidates: [{ finishReason: "private-unknown-reason" }] }, code: "FINISH_UNKNOWN" },
    { payload: { candidates: [{ finishReason: "STOP", content: { parts: null } }] }, code: "EMPTY_RESPONSE" },
    { payload: { candidates: [{ finishReason: "STOP", content: null }] }, code: "EMPTY_RESPONSE" },
  ];
  for (const { payload, code } of cases) {
    let calls = 0;
    const provider = new LiveGemini("test", undefined, async () => {
      calls++;
      return Response.json(payload);
    });
    await assert.rejects(() => provider.plan(input()), (error: unknown) => {
      assert.ok(error instanceof DesignError);
      assert.equal(error.diagnostic.stage, "design-planning");
      assert.equal(error.diagnostic.provider, "gemini");
      assert.equal(error.diagnostic.code, code);
      assert.ok(!JSON.stringify(error.diagnostic).includes("private-unknown-reason"));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("nullable optional Gemini fields and thought parts do not corrupt the validated design", async () => {
  const original = input();
  const valid = await new MockPlanner().plan(original);
  const provider = new LiveGemini("test", undefined, async () => Response.json({
    promptFeedback: null,
    candidates: [{
      finishReason: "STOP",
      content: { parts: [
        { text: "private-thought-not-json", thought: true },
        { text: null, thought: null },
        { text: JSON.stringify(proposalFor(valid)), thought: null },
      ] },
    }],
  }));
  const result = await provider.plan(original);
  assert.deepEqual(designPlanSchema.parse(result), valid);
});

test("all prompt inputs are validated before provider access", async () => {
  const original = input();
  const invalidInputs = [
    { ...original, taste: { ...original.taste, music: ["x".repeat(81)] } },
    { ...original, context: { ...original.context, recommendations: [{ id: "a", name: "b", type: "artist", tags: ["x".repeat(101)] }] } },
    { ...original, current: { ...original.current, rug: "not-in-catalog" } },
    { ...original, adjacency: Number.NaN },
    { ...original, adjacency: 101 },
    { ...original, instruction: " " },
    { ...original, instruction: "x".repeat(501) },
    { ...original, catalog: { rug: ["not-in-catalog"] } },
  ];
  let calls = 0;
  const provider = new LiveGemini("test", undefined, async () => {
    calls++;
    return completed({});
  });
  for (const invalid of invalidInputs) {
    await assert.rejects(() => provider.plan(invalid as PlannerInput), (error: unknown) => {
      assert.ok(error instanceof DesignError);
      assert.equal(error.diagnostic.code, "INVALID_INPUT");
      assert.equal(error.diagnostic.retryable, false);
      assert.ok(error.diagnostic.issues?.length);
      return true;
    });
  }
  assert.equal(calls, 0);
});

test("unsupported inspiration edits retain actionable diagnostics", async () => {
  await assert.rejects(() => new MockPlanner().plan({ ...input(), instruction: "Move the window" }), (error: unknown) => {
    assert.ok(error instanceof DesignError);
    assert.equal(error.diagnostic.code, "UNSUPPORTED_INSPIRATION_EDIT");
    assert.equal(error.diagnostic.retryable, false);
    return true;
  });
});
