import { requestSchema } from "@/lib/validation/contracts";
import { generateDesign, requireConfiguration } from "@/lib/agent/orchestrate";
import { readJson, apiError } from "@/lib/agent/http";
import { comparisonSchema } from "@/lib/agent/comparison";
export const maxDuration = 180;
export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await readJson(request));
    requireConfiguration(input.demo);
    const [generic, cultural] = await Promise.all([
      generateDesign({ ...input, generic: true }, () => {}),
      generateDesign({ ...input, generic: false }, () => {}),
    ]);
    return Response.json(comparisonSchema.parse({ generic, cultural }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
