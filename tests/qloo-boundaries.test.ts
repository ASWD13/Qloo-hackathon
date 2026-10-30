import { test } from "node:test";
import assert from "node:assert/strict";
import { LiveQloo } from "../lib/qloo/adapter";
import { DesignError } from "../lib/agent/errors";
import { contextSchema, type Taste } from "../lib/validation/contracts";

const taste: Taste = {
  music: ["Radiohead"],
  film: [],
  brands: [],
  wildcard: "",
};
const entity = {
  entity_id: "radiohead-id",
  name: "Radiohead",
  types: ["urn:entity:artist"],
};
const urlFor = (input: Parameters<typeof fetch>[0]) => new URL(String(input));

function provider(fetcher: typeof fetch) {
  return new LiveQloo("private-api-key", "https://api.qloo.com", fetcher);
}

test("real Qloo envelopes without success and with types become live context", async () => {
  const qloo = provider(async (input) => {
    const url = urlFor(input);
    if (url.pathname === "/search")
      return Response.json({ results: [{ ...entity, private_metadata: "discard" }] });
    const category = url.searchParams.get("filter.type")!;
    return Response.json({
      results: {
        entities: [{ entity_id: category, name: "Adjacent taste", types: [category] }],
      },
    });
  });
  const context = await qloo.context(taste);
  assert.equal(context.source, "live");
  assert.deepEqual(context.entities, [{
    id: "radiohead-id", name: "Radiohead", type: "urn:entity:artist", tags: [],
  }]);
  assert.equal(context.recommendations.length, 3);
  assert.deepEqual(context.recommendations.map((item) => item.type), [
    "urn:entity:artist", "urn:entity:movie", "urn:entity:brand",
  ]);
  assert.deepEqual(context.warnings, []);
  assert.deepEqual(contextSchema.parse(context), context);
});

test("null optional metadata defaults safely and legacy type fields still work", async () => {
  const qloo = provider(async (input) => {
    if (urlFor(input).pathname === "/search")
      return Response.json({ results: [{
        ...entity, types: null, type: null, subtype: null, tags: null,
      }] });
    return Response.json({ results: { entities: [{
      entity_id: "legacy", name: "Legacy taste", types: null,
      type: "urn:entity", subtype: "urn:entity:brand",
      tags: [null, { name: null }, { name: "Minimal" }, { name: "Minimal" }],
    }] } });
  });
  const context = await qloo.context(taste);
  assert.equal(context.entities[0].type, "unknown");
  assert.deepEqual(context.entities[0].tags, []);
  assert.deepEqual(context.recommendations, [{
    id: "legacy", name: "Legacy taste", type: "urn:entity:brand", tags: ["Minimal"],
  }]);
});

test("invalid search and recommendation rows do not discard the valid subset", async () => {
  const qloo = provider(async (input) => {
    if (urlFor(input).pathname === "/search")
      return Response.json({ results: [null, { name: "Radiohead" }, entity] });
    return Response.json({ results: { entities: [
      { entity_id: "x".repeat(121), name: "Invalid identity" },
      { entity_id: "adjacent", name: "Valid adjacent taste", types: ["urn:entity:person"] },
      { entity_id: "empty", name: " " },
    ] } });
  });
  const context = await qloo.context(taste);
  assert.equal(context.source, "live");
  assert.deepEqual(context.entities.map((item) => item.id), ["radiohead-id"]);
  assert.deepEqual(context.recommendations.map((item) => item.id), ["adjacent"]);
  assert.ok(context.warnings.some((warning) => warning.includes("taste-resolution")));
  assert.ok(context.warnings.some((warning) => warning.includes("cultural-context")));
});

test("normalized context is allowlisted, bounded, and deduplicated", async () => {
  const qloo = provider(async (input) => {
    const url = urlFor(input);
    if (url.pathname === "/search") return Response.json({ results: [entity] });
    const category = url.searchParams.get("filter.type")!;
    return Response.json({ results: { entities: [
      entity,
      ...Array.from({ length: 30 }, (_, index) => ({
        entity_id: `${category}-${index}`,
        name: "n".repeat(200),
        types: ["unsupported-visual-combination-".repeat(8)],
        tags: Array.from({ length: 30 }, (_, tag) => ({ name: `${tag}-${"t".repeat(120)}` })),
        secret: "never-forward-this",
      })),
    ] } });
  });
  const context = await qloo.context(taste);
  assert.ok(context.recommendations.length > 0);
  assert.ok(context.recommendations.length <= 18);
  assert.equal(new Set(context.recommendations.map((item) => item.id)).size, context.recommendations.length);
  assert.ok(context.recommendations.every((item) => item.id !== entity.entity_id));
  for (const item of context.recommendations) {
    assert.equal(item.name.length, 160);
    assert.equal(item.type.length, 80);
    assert.equal(item.tags.length, 12);
    assert.ok(item.tags.every((tag) => tag.length <= 100));
    assert.deepEqual(Object.keys(item).sort(), ["id", "name", "tags", "type"]);
  }
  assert.deepEqual(contextSchema.parse(context), context);
  assert.ok(!JSON.stringify(context).includes("never-forward-this"));
});

test("a transient Qloo failure retries and can still produce live context", async () => {
  let searches = 0;
  const qloo = provider(async (input) => {
    if (urlFor(input).pathname === "/search") {
      searches++;
      if (searches === 1) return new Response("private failure body", { status: 503 });
      return Response.json({ results: [entity] });
    }
    return Response.json({ results: { entities: [] } });
  });
  const context = await qloo.context(taste);
  assert.equal(searches, 2);
  assert.equal(context.source, "live");
  assert.deepEqual(context.warnings, []);
});

test("all failed searches surface a safe stage-specific provider error", async () => {
  let calls = 0;
  const qloo = provider(async () => {
    calls++;
    return new Response("private-api-key secret provider body", { status: 401 });
  });
  await assert.rejects(() => qloo.context(taste), (error: unknown) => {
    assert.ok(error instanceof DesignError);
    assert.equal(error.diagnostic.stage, "taste-resolution");
    assert.equal(error.diagnostic.provider, "qloo");
    assert.equal(error.diagnostic.status, 401);
    assert.equal(error.diagnostic.retryable, false);
    assert.ok(!JSON.stringify(error).includes("private-api-key"));
    assert.ok(!JSON.stringify(error).includes("secret provider body"));
    return true;
  });
  assert.equal(calls, 1);
});

test("exhausted transient searches expose their status instead of becoming no-match", async () => {
  let calls = 0;
  const qloo = provider(async () => {
    calls++;
    return new Response("private provider body", { status: 503 });
  });
  await assert.rejects(() => qloo.context(taste), (error: unknown) => {
    assert.ok(error instanceof DesignError);
    assert.equal(error.diagnostic.stage, "taste-resolution");
    assert.equal(error.diagnostic.status, 503);
    assert.equal(error.diagnostic.retryable, true);
    return true;
  });
  assert.equal(calls, 2);
});

test("explicit failure envelopes and malformed envelopes are not successful searches", async () => {
  for (const body of [
    { success: false, results: [entity] },
    { results: { entities: [entity] } },
  ]) {
    await assert.rejects(
      () => provider(async () => Response.json(body)).context(taste),
      (error: unknown) => {
        assert.ok(error instanceof DesignError);
        assert.equal(error.diagnostic.stage, "taste-resolution");
        assert.equal(error.diagnostic.provider, "qloo");
        assert.equal(error.diagnostic.code, "INVALID_RESPONSE");
        return true;
      },
    );
  }
});

test("partial search and category failures preserve context with safe diagnostics", async () => {
  const logs: unknown[][] = [];
  const originalWarn = console.warn;
  const originalEnvironment = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  console.warn = (...args: unknown[]) => { logs.push(args); };
  try {
    const qloo = provider(async (input) => {
      const url = urlFor(input);
      if (url.pathname === "/search") {
        if (url.searchParams.get("query") === "Unresolved private taste")
          return new Response("private provider response", { status: 403 });
        return Response.json({ results: [entity] });
      }
      if (url.searchParams.get("filter.type") === "urn:entity:movie")
        return new Response("private provider response", { status: 401 });
      return Response.json({ results: { entities: [{
        entity_id: "adjacent", name: "Adjacent taste", types: ["urn:entity:brand"],
      }] } });
    });
    const context = await qloo.context({ ...taste, brands: ["Unresolved private taste"] });
    assert.equal(context.source, "live");
    assert.equal(context.entities.length, 1);
    assert.equal(context.recommendations.length, 1);
    assert.deepEqual(context.unresolved, ["Unresolved private taste"]);
    assert.ok(context.warnings.some((warning) => /qloo\/taste-resolution.*403/.test(warning)));
    assert.ok(context.warnings.some((warning) => /qloo\/cultural-context.*401/.test(warning)));
    assert.equal(logs.length, 2);
    const diagnostics = logs.map((args) => args[1]);
    assert.ok(diagnostics.some((value) => typeof value === "object" && value !== null &&
      "stage" in value && value.stage === "cultural-context"));
    const safeOutput = JSON.stringify({ logs, warnings: context.warnings });
    for (const secret of ["private-api-key", "private provider response", "Unresolved private taste", "api.qloo.com"])
      assert.ok(!safeOutput.includes(secret));
  } finally {
    console.warn = originalWarn;
    if (originalEnvironment === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: originalEnvironment });
  }
});

test("successful no-match searches remain explicit taste rather than invented context", async () => {
  const qloo = provider(async (input) => {
    if (urlFor(input).searchParams.get("query") === "Failed taste")
      return new Response("provider error", { status: 403 });
    return Response.json({ results: [{ ...entity, name: "Not an exact match" }] });
  });
  const context = await qloo.context({ ...taste, brands: ["Failed taste"] });
  assert.equal(context.source, "unavailable");
  assert.deepEqual(context.entities, []);
  assert.deepEqual(context.recommendations, []);
  assert.deepEqual(context.unresolved, ["Radiohead", "Failed taste"]);
  assert.ok(context.warnings.some((warning) => warning.includes("Explicit tastes")));
});
