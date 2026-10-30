import { configuration } from "@/lib/agent/orchestrate";
export function GET() {
  const config = configuration();
  return Response.json(
    {
      status: "ok",
      aiMode: config.mock
        ? "mock"
        : config.qloo && config.gemini
          ? "live"
          : "unconfigured",
      missing: [
        ...(!config.qloo ? ["QLOO_API_KEY"] : []),
        ...(!config.gemini ? ["GEMINI_API_KEY"] : []),
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
