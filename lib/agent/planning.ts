import { z } from "zod";
import { assetSelections, designPlanSchema, type DesignPlan, type DesignProposal } from "./plan";
import { executeTools, diffToTools } from "@/lib/room/tools";
import { roomSchema, type RoomState } from "@/lib/room/state";
import { applyDesignInstructions, refinementScope } from "@/lib/room/constraints";
import { assertValidLayout } from "@/lib/room/anchors";
import { colors } from "@/lib/assets/catalog";
import { DesignError } from "./errors";
import type { PlannerInput } from "@/lib/gemini/adapter";

export function planForRoom(plan: DesignPlan, baseline: RoomState, target: RoomState): DesignPlan {
  return designPlanSchema.parse({
    ...plan, constraints: target.constraints, assetSelections: assetSelections(target), placements: target.placements,
    palette: [target.wallColor, target.accentColor, colors[target.bedFrame], colors[target.bedding], colors[target.rug] ?? "#dfd6bd"],
    tools: diffToTools(baseline, target),
  });
}

export function compileDesignProposal(input: PlannerInput, proposal: DesignProposal): DesignPlan {
  const { surfaces, ...metadata } = proposal;
  const proposed = roomSchema.parse({ ...input.current, ...proposal.assetSelections, ...surfaces, placements: proposal.placements, constraints: proposal.constraints });
  const target = roomSchema.parse(applyDesignInstructions(input.current, proposed, input.instruction ?? input.taste.wildcard, Boolean(input.instruction)));
  const compiled = planForRoom({ ...metadata, tools: diffToTools(input.current, target) }, input.current, target);
  return validateDesignPlan(input, compiled);
}


/** Strict tools and manifest first; explicit user constraints and scoped edits then gate execution. */
export function validateDesignPlan(input: PlannerInput, candidate: DesignPlan): DesignPlan {
  try {
    const proposed = executeTools(input.current, candidate.tools);
    if (JSON.stringify(assetSelections(proposed)) !== JSON.stringify(candidate.assetSelections) || JSON.stringify(proposed.placements) !== JSON.stringify(candidate.placements) || JSON.stringify(proposed.constraints) !== JSON.stringify(candidate.constraints))
      throw new Error("Plan metadata does not match tool effects");
    const instruction = input.instruction ?? input.taste.wildcard;
    const target = roomSchema.parse(applyDesignInstructions(input.current, proposed, instruction, Boolean(input.instruction)));
    assertValidLayout(target);
    const scope = input.instruction ? refinementScope(input.instruction) : undefined;
    let requests = candidate.generatedTextureRequests.filter(({ slot }) => {
      if ((slot === "rug" && target.rug === "none") || (slot === "artwork" && target.artwork === "none")) return false;
      if (target.constraints.locked.includes("textures") || target.constraints.locked.includes(`textures.${slot}`) || target.constraints.locked.includes(slot)) return false;
      return !scope || scope.has(slot) || scope.has(`textures.${slot}`);
    });
    if (input.instruction && /outside|experimental|further/i.test(input.instruction)) {
      // Compile an adventurous proposal into a small edit, rather than making
      // unrelated decor changes a prerequisite for an otherwise valid refinement.
      const allowed = new Set<string>();
      for (const field of ["artwork", "bedding", "rug", "decor"] as const) {
        const changed = JSON.stringify(target[field]) !== JSON.stringify(input.current[field])
          || requests.some(({ slot }) => slot === field)
          || (field !== "decor" && target.textures[field] !== input.current.textures[field]);
        if (!changed) continue;
        if (allowed.size < 3) allowed.add(field);
        else {
          Reflect.set(target, field, structuredClone(input.current[field]));
          if (field !== "decor") target.textures[field] = input.current.textures[field];
        }
      }
      requests = requests.filter(({ slot }) => allowed.has(slot));
    }
    return planForRoom({ ...candidate, generatedTextureRequests: requests }, input.current, target);
  } catch (error) {
    throw new DesignError({
      stage: "plan-validation", provider: "gemini", code: "INVALID_PLAN", retryable: true,
      message: "The design conflicts with a protected element, placement clearance, or its declared selections. Your room is unchanged; please retry.",
      issues: [{ path: "tools", code: error instanceof Error && !(error instanceof z.ZodError) ? error.message.slice(0, 240) : "layout_constraints_or_plan_mismatch" }],
    });
  }
}
