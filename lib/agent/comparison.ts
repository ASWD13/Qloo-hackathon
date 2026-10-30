import { z } from "zod";
import { resultSchema } from "./plan";
export const comparisonSchema = z
  .object({ generic: resultSchema, cultural: resultSchema })
  .strict()
  .refine(
    (pair) =>
      pair.generic.model === pair.cultural.model &&
      pair.generic.temperature === pair.cultural.temperature &&
      pair.generic.planner === pair.cultural.planner &&
      JSON.stringify(pair.generic.baseline) ===
        JSON.stringify(pair.cultural.baseline),
    { message: "Comparison settings differ." },
  );
export type Comparison = z.infer<typeof comparisonSchema>;
