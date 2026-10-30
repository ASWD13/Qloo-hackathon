import { z } from "zod";
import type {
  Taste,
  CulturalContext,
  CulturalEntity,
} from "@/lib/validation/contracts";
import { contextSchema, tasteSchema } from "@/lib/validation/contracts";
import {
  DesignError,
  providerJson,
  validationIssues,
} from "@/lib/agent/errors";
import { profileIndex } from "@/lib/agent/profiles";

const rawEntity = z.object({
  entity_id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1),
  types: z.array(z.string().trim().min(1)).nullish(),
  type: z.string().trim().nullish(),
  subtype: z.string().trim().nullish(),
  tags: z.array(z.unknown()).nullish(),
});
const rawTag = z.object({ name: z.string().trim().min(1) });
const searchResponse = z.object({
  success: z.literal(true).optional(),
  results: z.array(z.unknown()),
});
const insightsResponse = z.object({
  success: z.literal(true).optional(),
  results: z.object({ entities: z.array(z.unknown()) }),
});
export function normalizeEntity(
  raw: z.infer<typeof rawEntity>,
): CulturalEntity {
  const tags = (raw.tags ?? []).flatMap((tag) => {
    const result = rawTag.safeParse(tag);
    return result.success ? [result.data.name.slice(0, 100)] : [];
  });
  return {
    id: raw.entity_id,
    name: raw.name.slice(0, 160),
    type: (
      raw.types?.find((type) => type !== "urn:entity") ||
      raw.subtype ||
      raw.type ||
      "unknown"
    ).slice(0, 80),
    tags: [...new Set(tags)].slice(0, 12),
  };
}
const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

type QlooStage = "taste-resolution" | "cultural-context";

function responseError(error: unknown, stage: QlooStage): DesignError {
  if (error instanceof DesignError) return error;
  return new DesignError({
    stage,
    provider: "qloo",
    status: 200,
    code: "INVALID_RESPONSE",
    message: "Cultural discovery returned an unsupported response. Please retry.",
    retryable: true,
    ...(error instanceof z.ZodError ? { issues: validationIssues(error) } : {}),
  });
}

function failureWarning(error: DesignError): string {
  const { stage, provider, status, code } = error.diagnostic;
  if (process.env.NODE_ENV === "development")
    console.warn("Cultural discovery diagnostic", error.diagnostic);
  return `${provider}/${stage}: ${code}${status ? ` (HTTP ${status})` : ""}. Some cultural context is unavailable.`;
}

function validRows(rows: unknown[]) {
  const items: z.infer<typeof rawEntity>[] = [];
  let rejected = false;
  for (const row of rows) {
    const parsed = rawEntity.safeParse(row);
    if (parsed.success) items.push(parsed.data);
    else rejected = true;
  }
  return { items, rejected };
}

function validatedContext(context: CulturalContext): CulturalContext {
  const result = contextSchema.safeParse(context);
  if (result.success) return result.data;
  throw new DesignError({
    stage: "cultural-context",
    provider: "qloo",
    code: "INVALID_CONTEXT",
    message: "Cultural discovery could not produce valid context. Please retry.",
    retryable: true,
    issues: validationIssues(result.error),
  });
}
export interface QlooAdapter {
  context(taste: Taste): Promise<CulturalContext>;
}
export function mockContext(taste: Taste): CulturalContext {
  const names = [
    ["Björk", "Perfect Days", "COS"],
    ["Rosalía", "Baby Driver", "Adidas"],
    ["Beach House", "Lost in Translation", "Sézane"],
    ["Kraftwerk", "Ghost in the Shell", "Acronym"],
  ][profileIndex(taste)];
  const entities = [
    ...taste.music.map((name) => ({ name, type: "urn:entity:artist" })),
    ...taste.film.map((name) => ({ name, type: "urn:entity:movie" })),
    ...taste.brands.map((name) => ({ name, type: "urn:entity:brand" })),
  ].map((e, i) => ({ ...e, id: "fixture-input-" + i, tags: [] }));
  return {
    source: "mock",
    entities,
    recommendations: names.map((name, i) => ({
      id: "fixture-adjacent-" + i,
      name,
      type: ["urn:entity:artist", "urn:entity:movie", "urn:entity:brand"][i],
      tags: [],
    })),
    unresolved: [],
    warnings: [
      "Illustrative fixture, not Qloo data. Entity support and these relationships are not live-verified.",
    ],
  };
}
export class MockQloo implements QlooAdapter {
  async context(taste: Taste) {
    return mockContext(taste);
  }
}
export class LiveQloo implements QlooAdapter {
  constructor(
    private key: string,
    private base = "https://api.qloo.com",
    private fetcher: typeof fetch = fetch,
  ) {
    let url: URL;
    try {
      url = new URL(base);
    } catch {
      throw new DesignError({
        stage: "configuration",
        provider: "qloo",
        code: "INVALID_BASE_URL",
        message: "Use an official HTTPS Qloo API base URL in the server settings.",
        retryable: false,
      });
    }
    if (
      url.protocol !== "https:" ||
      ![
        "api.qloo.com",
        "hackathon.api.qloo.com",
        "staging.api.qloo.com",
      ].includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new DesignError({
        stage: "configuration",
        provider: "qloo",
        code: "INVALID_BASE_URL",
        message: "Use an official HTTPS Qloo API base URL in the server settings.",
        retryable: false,
      });
  }
  private async get(
    path: string,
    params: Record<string, string>,
    stage: QlooStage,
  ) {
    const url = new URL(path, this.base);
    url.search = new URLSearchParams(params).toString();
    return providerJson(
      this.fetcher,
      url,
      { headers: { "X-Api-Key": this.key, Accept: "application/json" } },
      { provider: "qloo", stage, timeoutMs: 8000 },
    );
  }
  async context(taste: Taste): Promise<CulturalContext> {
    const parsedTaste = tasteSchema.safeParse(taste);
    if (!parsedTaste.success)
      throw new DesignError({
        stage: "taste-resolution", provider: "qloo", code: "INVALID_INPUT",
        retryable: false, message: "Check your selected cultural tastes before trying again.",
        issues: validationIssues(parsedTaste.error),
      });
    taste = parsedTaste.data;
    const inputs = [
      ...taste.music.map((name) => ({ name, types: "urn:entity:artist" })),
      ...taste.film.map((name) => ({
        name,
        types: "urn:entity:movie,urn:entity:person,urn:entity:brand",
      })),
      ...taste.brands.map((name) => ({ name, types: "urn:entity:brand" })),
    ];
    const entities: CulturalEntity[] = [];
    const unresolved: string[] = [];
    const warnings: string[] = [];
    const matches = await Promise.all(
      inputs.map(async (input) => {
        try {
          const result = searchResponse.parse(
            await this.get(
              "/search",
              { query: input.name, types: input.types, take: "5" },
              "taste-resolution",
            ),
          );
          const rows = validRows(result.results);
          const name = normalize(input.name);
          const exact = rows.items.filter(
            (entity) => name.length > 0 && normalize(entity.name) === name,
          );
          return {
            input: input.name,
            entity: exact.length === 1 ? normalizeEntity(exact[0]) : undefined,
            rejected: rows.rejected,
            error: undefined,
          };
        } catch (error) {
          return {
            input: input.name,
            entity: undefined,
            rejected: false,
            error: responseError(error, "taste-resolution"),
          };
        }
      }),
    );
    const failures = matches.flatMap((match) => match.error ? [match.error] : []);
    if (matches.length > 0 && failures.length === matches.length)
      throw failures[0];
    for (const match of matches) {
      if (match.entity) {
        if (entities.length < 9 && !entities.some((e) => e.id === match.entity!.id))
          entities.push(match.entity);
      } else if (unresolved.length < 9) {
        unresolved.push(match.input.slice(0, 80));
      }
      if (match.error) warnings.push(failureWarning(match.error));
      if (match.rejected)
        warnings.push("qloo/taste-resolution: Invalid entity rows were ignored.");
    }
    if (!entities.length)
      return validatedContext({
        source: "unavailable",
        entities: [],
        recommendations: [],
        unresolved,
        warnings: [
          ...new Set(warnings),
          "No exact, unambiguous entities resolved. Explicit tastes remain available to the planner.",
        ].slice(0, 12),
      });
    const recommendations: CulturalEntity[] = [];
    const batches = await Promise.all(
      ["artist", "movie", "brand"].map(async (category) => {
        try {
          const result = insightsResponse.parse(
            await this.get(
              "/v2/insights",
              {
                "filter.type": "urn:entity:" + category,
                "signal.interests.entities": entities.map((e) => e.id).join(","),
                take: "6",
              },
              "cultural-context",
            ),
          );
          const rows = validRows(result.results.entities);
          return {
            items: rows.items.slice(0, 6).map(normalizeEntity),
            warning: rows.rejected
              ? "qloo/cultural-context: Invalid recommendation rows were ignored."
              : null,
          };
        } catch (error) {
          return {
            items: [],
            warning: `${failureWarning(responseError(error, "cultural-context"))} Category: ${category}.`,
          };
        }
      }),
    );
    for (const batch of batches) {
      if (batch.warning) warnings.push(batch.warning);
      for (const entity of batch.items)
        if (
          recommendations.length < 18 &&
          !entities.some((item) => item.id === entity.id) &&
          !recommendations.some((item) => item.id === entity.id)
        )
          recommendations.push(entity);
    }
    return validatedContext({
      source: "live",
      entities,
      recommendations,
      unresolved,
      warnings: [...new Set(warnings)].slice(0, 12),
    });
  }
}
