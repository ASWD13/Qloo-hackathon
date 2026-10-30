import { requestSchema } from "@/lib/validation/contracts";
import { roomSchema } from "@/lib/room/state";
import { generateDesign, requireConfiguration } from "@/lib/agent/orchestrate";
import { readJson, apiError, streamDesign } from "@/lib/agent/http";
const generateSchema = requestSchema.extend({ current: roomSchema.optional() });
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const input = generateSchema.parse(await readJson(request));
    requireConfiguration(input.demo);
    return streamDesign((stage) => generateDesign(input, stage, input.current));
  } catch (error) {
    return apiError(error);
  }
}
