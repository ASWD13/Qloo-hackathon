import { resultSchema, type DesignResult } from "./plan";
import { DesignError, diagnosticFor, diagnosticSchema } from "./errors";
function serverError(payload: unknown): never {
  const parsed = diagnosticSchema.safeParse(payload);
  if (parsed.success) {
    if (process.env.NODE_ENV === "development")
      console.error("[TasteSpace generation]", parsed.data);
    throw new DesignError(parsed.data);
  }
  throw new Error("The studio returned an unreadable response. Your room is unchanged; please retry.");
}
export async function requestDesign(
  path: string,
  body: unknown,
  onStage: (message: string) => void,
  signal?: AbortSignal,
): Promise<DesignResult> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json();
    serverError(payload.error);
  }
  if (!response.body) throw new Error("No design response received.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: DesignResult | undefined;
  let complete = false;
  let providerFailure: unknown;
  const consume = (line: string) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      if (event.type === "stage" && typeof event.message === "string")
        onStage(event.message);
      else if (event.type === "error") {
        try { serverError(event.error); }
        catch (error) { providerFailure = error; }
      }
      else if (event.type === "result") result = resultSchema.parse(event.result);
      else throw new Error("Unexpected design response.");
    } catch (error) {
      if (error instanceof DesignError) throw error;
      const diagnostic = diagnosticFor(error, "response");
      if (process.env.NODE_ENV === "development")
        console.error("[TasteSpace generation]", diagnostic);
      throw new DesignError(diagnostic);
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) { complete = true; break; }
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    buffer += decoder.decode();
    consume(buffer);
  } finally {
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (providerFailure) throw providerFailure;
  if (!result) throw new Error("Design response ended early. Room unchanged.");
  return result;
}
export function delay(ms: number) {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}
