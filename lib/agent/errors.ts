import { z } from "zod";

export const diagnosticSchema = z.object({
  stage: z.enum(["request", "configuration", "taste-resolution", "cultural-context", "design-planning", "plan-validation", "room-execution", "response"]),
  provider: z.enum(["qloo", "gemini", "tastespace"]),
  status: z.number().int().optional(),
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
  issues: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
});
export type DesignDiagnostic = z.infer<typeof diagnosticSchema>;
export class DesignError extends Error {
  constructor(readonly diagnostic: DesignDiagnostic) {
    super(diagnostic.message);
    this.name = "DesignError";
  }
}
export function validationIssues(error: z.ZodError) {
  return error.issues.slice(0, 8).map((issue) => ({
    path: issue.path.join("."), code: issue.code,
  }));
}
export function diagnosticFor(error: unknown, stage: DesignDiagnostic["stage"] = "response"): DesignDiagnostic {
  if (error instanceof DesignError) return error.diagnostic;
  if (stage === "request" && error instanceof SyntaxError) return {
    stage, provider: "tastespace", status: 400, code: "INVALID_JSON", retryable: false,
    message: "The design brief is not valid JSON. Check the request body and try again.",
  };
  if (error instanceof z.ZodError) return {
    stage, provider: "tastespace", code: "INVALID_DATA", retryable: true,
    message: stage === "request" ? "Check your selected tastes and room inputs, then try again." : "The room design did not pass validation. Your room is unchanged; please retry.",
    issues: validationIssues(error),
  };
  return { stage, provider: "tastespace", code: "UNEXPECTED_ERROR", retryable: true,
    message: "The room update was interrupted. Your room is unchanged; please retry." };
}

// Never include request headers, URLs, provider bodies, or user text in diagnostics.
export async function providerJson(
  fetcher: typeof fetch,
  url: string | URL,
  init: RequestInit,
  details: { provider: "qloo" | "gemini"; stage: DesignDiagnostic["stage"]; timeoutMs: number },
): Promise<unknown> {
  const { provider, stage, timeoutMs } = details;
  const name = provider === "qloo" ? "Cultural discovery" : "Design planning";
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetcher(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    } catch {
      if (attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 400)); continue; }
      throw new DesignError({ stage, provider, code: "CONNECTION_TIMEOUT", retryable: true,
        message: `${name} could not reach its provider after a retry. Please try again shortly; your room is unchanged.` });
    }
    if (!response.ok) {
      const retryable = [408, 429].includes(response.status) || response.status >= 500;
      if (retryable && attempt === 0) {
        const seconds = Number(response.headers.get("retry-after"));
        await new Promise((resolve) => setTimeout(resolve, Math.min(1500, Math.max(400, Number.isFinite(seconds) ? seconds * 1000 : 400))));
        continue;
      }
      const action = response.status === 401 || response.status === 403
        ? "The studio’s provider credentials need attention. Please try again later."
        : response.status === 404 && provider === "gemini"
          ? "The configured design model is unavailable. Check GEMINI_MODEL in the server settings."
          : response.status === 429 ? "The studio has reached its provider limit. Please try again shortly."
            : retryable ? "The provider is temporarily unavailable after a retry. Please try again."
              : "The provider rejected the request. Please check the server provider settings.";
      throw new DesignError({ stage, provider, status: response.status, code: `HTTP_${response.status}`,
        retryable, message: `${name} could not finish. ${action} Your room is unchanged.` });
    }
    try { return await response.json(); }
    catch {
      throw new DesignError({ stage, provider, status: response.status, code: "INVALID_JSON", retryable: true,
        message: `${name} returned an unreadable response. Your room is unchanged; please retry.` });
    }
  }
  throw new Error("Unreachable provider attempt");
}
