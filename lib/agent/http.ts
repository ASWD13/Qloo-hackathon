import "server-only";
import { z } from "zod";
import { DesignError, diagnosticFor } from "./errors";
import type { DesignResult } from "./plan";
function requestError(message: string, code: string, status: number) {
  return new DesignError({
    stage: "request", provider: "tastespace", status, code, message, retryable: false,
  });
}
export async function readJson(request: Request): Promise<unknown> {
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    throw requestError("Send the design brief as JSON.", "CONTENT_TYPE", 415);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (origin && new URL(origin).host !== host)
    throw requestError("Open the studio on the same site before generating.", "CROSS_ORIGIN", 403);
  if (!request.body) throw requestError("Add your taste selections before generating.", "EMPTY_BODY", 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16384) {
        await reader.cancel();
        throw requestError("The design brief is too large. Shorten your inputs and retry.", "BODY_LIMIT", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}
function errorPayload(error: unknown, stage: "request" | "response") {
  const diagnostic = diagnosticFor(error, stage);
  if (process.env.NODE_ENV === "development")
    console.error("[TasteSpace generation]", diagnostic);
  const { issues, ...safe } = diagnostic;
  return {
    ...safe,
    ...(process.env.NODE_ENV === "development" && issues ? { issues } : {}),
  };
}
export function apiError(error: unknown) {
  const diagnostic = errorPayload(error, "request");
  const status = error instanceof z.ZodError || error instanceof SyntaxError
    ? 400
    : error instanceof DesignError
      ? diagnostic.provider === "tastespace" && diagnostic.status
        ? diagnostic.status
        : diagnostic.stage === "configuration" ? 503 : diagnostic.retryable ? 503 : 502
      : 500;
  return Response.json({ error: diagnostic }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}
export function streamDesign(
  run: (stage: (message: string) => void) => Promise<DesignResult>,
) {
  const encoder = new TextEncoder();
  let cancelled = false;
  return new Response(
    new ReadableStream({
      async start(controller) {
        const emit = (event: unknown) => {
          if (!cancelled)
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };
        try {
          const result = await run((message) =>
            emit({ type: "stage", message }),
          );
          emit({ type: "result", result });
        } catch (error) {
          const diagnostic = errorPayload(error, "response");
          emit({ type: "error", message: diagnostic.message, error: diagnostic });
        } finally {
          if (!cancelled) controller.close();
        }
      },
      cancel() {
        cancelled = true;
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
