import { z } from "zod";
import { requestSchema } from "@/lib/validation/contracts";
import { roomSchema } from "@/lib/room/state";
import { generateDesign, requireConfiguration } from "@/lib/agent/orchestrate";
import { readJson, apiError, streamDesign } from "@/lib/agent/http";
const refineSchema = requestSchema.extend({
  current: roomSchema,
  instruction: z.string().trim().min(1).max(500),
});
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const input = refineSchema.parse(await readJson(request));
    requireConfiguration(input.demo);
    return streamDesign((stage) =>
      generateDesign(input, stage, input.current, input.instruction),
    );
  } catch (error) {
    return apiError(error);
  }
}
