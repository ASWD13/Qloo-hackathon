import "server-only";
import { LiveQloo, MockQloo } from "@/lib/qloo/adapter";
import {
  LiveGemini,
  MockPlanner,
  MODEL_TEMPERATURE,
  DEFAULT_GEMINI_MODEL,
} from "@/lib/gemini/adapter";
import { defaultRoom, roomSchema, type RoomState } from "@/lib/room/state";
import { executeTools } from "@/lib/room/tools";
import { planForRoom, validateDesignPlan } from "./planning";
import { resolveTextureRequests } from "@/lib/huggingface/imageClient";
import { applyDesignInstructions } from "@/lib/room/constraints";
import { resultSchema, type DesignResult } from "./plan";
import { DesignError, diagnosticFor } from "./errors";
import { requestSchema, contextSchema } from "@/lib/validation/contracts";
import type {
  CulturalContext,
  DesignRequest,
} from "@/lib/validation/contracts";
export function configuration() {
  return {
    mock: process.env.USE_MOCK_AI === "true",
    qloo: Boolean(process.env.QLOO_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  };
}
export function requireConfiguration(demo: boolean) {
  const config = configuration();
  if (!demo && !config.mock && (!config.qloo || !config.gemini))
    throw new DesignError({
      stage: "configuration", provider: "tastespace", code: "MISSING_CREDENTIALS",
      retryable: false,
      message: "Live design is not connected. Add the missing server API credentials, or see an example for inspiration.",
    });
  return { ...config, mock: demo || config.mock };
}
export async function generateDesign(
  request: DesignRequest,
  stage: (message: string) => void,
  current: RoomState = defaultRoom,
  instruction?: string,
): Promise<DesignResult> {
  requestSchema.parse({
    taste: request.taste, adjacency: request.adjacency,
    demo: request.demo, generic: request.generic,
  });
  roomSchema.parse(current);
  const config = requireConfiguration(request.demo);
  const start = performance.now();
  stage(request.generic ? "Reading your taste" : "Finding cultural signals");
  let context: CulturalContext = {
    source: "omitted",
    entities: [],
    recommendations: [],
    unresolved: [],
    warnings: [],
  };
  if (!request.generic) {
    context = await (
      config.mock
        ? new MockQloo()
        : new LiveQloo(
            process.env.QLOO_API_KEY!,
            process.env.QLOO_API_BASE_URL || "https://api.qloo.com",
          )
    ).context(request.taste);
  }
  context = contextSchema.parse(context);
  stage("Building your palette & choosing materials");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const planner = config.mock
    ? new MockPlanner()
    : new LiveGemini(process.env.GEMINI_API_KEY!, model);
  const plannerInput = { taste: request.taste, context, adjacency: instruction && /outside|experimental|further/i.test(instruction) ? Math.min(100, request.adjacency + 20) : request.adjacency, current, instruction };
  let plan = validateDesignPlan(plannerInput, await planner.plan(plannerInput));
  let room = executeTools(current, plan.tools);
  const review = { performed: false, notes: ["Optional review unavailable; the validated initial plan was preserved."], appliedChanges: 0 };
  stage("Reviewing balance, clearances & constraints");
  try {
    const critique = await planner.review(plannerInput, plan);
    review.performed = true;
    review.notes = critique.notes;
    if (critique.changes.length) {
      if (critique.changes.some((call) => ["set_constraints", "set_texture", "finish_design"].includes(call.tool))) throw new Error("Review cannot change protections or generated textures");
      const revised = executeTools(room, critique.changes);
      const guarded = roomSchema.parse(applyDesignInstructions(current, revised, instruction ?? request.taste.wildcard, Boolean(instruction)));
      // A critique cannot expand the requested edit or override explicit instructions.
      if (JSON.stringify(guarded) !== JSON.stringify(revised)) throw new Error("Review exceeded the design brief");
      const revisedPlan = validateDesignPlan(plannerInput, planForRoom(plan, current, revised));
      if (JSON.stringify(executeTools(current, revisedPlan.tools)) !== JSON.stringify(revised)) throw new Error("Review exceeded the edit budget");
      room = revised;
      plan = revisedPlan;
      review.appliedChanges = critique.changes.length;
    }
  } catch {
    review.notes = ["Optional review changes were unavailable or rejected; the validated initial plan was preserved."];
  }
  stage("Preparing original art & textile surfaces");
  const generated = await resolveTextureRequests(plan.generatedTextureRequests, { mock: config.mock });
  const textureTools = Object.entries(generated.textures).map(([slot, value]) => ({ tool: "set_texture", slot, value }));
  if (textureTools.length) {
    room = executeTools(room, textureTools);
    plan = planForRoom(plan, current, room);
  }
  stage("Styling objects & lighting");
  try {
    room = executeTools(current, plan.tools);
    return resultSchema.parse({
      plan,
      room,
      context,
      review,
      textureOutcomes: generated.outcomes,
      planner: config.mock ? "mock" : "gemini",
      model: config.mock ? "deterministic-fixture-v1" : model,
      temperature: MODEL_TEMPERATURE,
      durationMs: Math.round(performance.now() - start),
      baseline: current,
    });
  } catch (error) {
    throw new DesignError(diagnosticFor(error, "room-execution"));
  }
}
