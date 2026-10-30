# Qloo capability evidence

Credentialed local verification performed 2026-10-24 against the account-assigned `https://hackathon.api.qloo.com`. No live cache or API keys are shipped. Provider coverage and quotas remain account-specific.

| Capability | Official evidence | Observed / implemented boundary |
|---|---|---|
| Authentication | [Onboarding](https://docs.qloo.com/reference/api-onboarding) | Server-only `X-Api-Key`; real authenticated search and insights succeeded |
| Entity resolution | [Search Entities](https://docs.qloo.com/reference/get-search) | GET `/search`, `query`, `types`, `take`; actual HTTP 200 envelopes contain `results` without `success`. The previous required `success:true` discarded every live entity |
| Entity metadata | [Search Entities](https://docs.qloo.com/reference/get-search) | Actual entities expose `types: string[]`, `entity_id`, `name`, and optional tags. Nullable optional metadata defaults safely; legacy subtype/type remain accepted; unneeded provider fields and image URLs are discarded |
| Cross-domain context | [Insights](https://docs.qloo.com/reference/insights-api-deep-dive), [Cross-category concepts](https://docs.qloo.com/docs/cross-category-insights) | GET `/v2/insights`, `filter.type`, `signal.interests.entities`, `take`; `results.entities` normalized for artist/movie/brand outputs |
| Conservative matching | Exact normalized name, not a similarity claim | Ambiguous or unmatched references remain explicit preferences, not invented Qloo entities; Unicode characters are preserved |
| Partial resolution | Local credentialed smoke and regression coverage | `Radiohead` + an intentionally nonexistent artist + `Muji` resolved the two valid references, retained the unmatched name, returned 18 discoveries and a valid 17-tool live plan |
| Rate limits / timeouts | [Search HTTP 429](https://docs.qloo.com/reference/get-search) | One retry for network/timeout, 408, 429, or 5xx; 8-second per-attempt timeout; bounded retry delay. Account quota and sustained throughput have not been measured |
| Failure behavior | Safe stage-specific error contract | Complete search-provider failure stops generation with provider/stage/status; partial search/category failures preserve valid context with safe warnings and development diagnostics. Successful searches with no exact matches can plan from explicit taste with honest source attribution |
| Exploration | Product preference, not graph distance | Controls the fraction of discoveries supplied to planning; never presented as Qloo similarity or distance |
| Interior choices | No interior-design endpoint assumed | Colors, materials, furniture, and lighting are TasteSpace/Gemini interpretations, not Qloo output |

## Live product verification

Before the redesign, manually selected Radiohead/A24/Muji, Bad Bunny/Fast & Furious/Nike, and Daft Punk/Blade Runner/Arc’teryx each produced live cultural context, validated Gemini plans and visibly different 3D rooms. The redesigned flow also completed Frank Ocean/Studio Ghibli/Patagonia and Lana Del Rey/Sofia Coppola/Anthropologie. These are observed requests, not a guarantee that every spelling or future combination resolves.

Seeded inspiration remains illustrative and does not claim live Qloo verification. The same normalization/plan validation, controlled tool executor, streamed response contract, client transaction history and 3D renderer are used wherever applicable. Attribution and source details are available under **Why this room?**.

Use the official HTTPS host assigned to your credentials. Production, staging and hackathon hosts are allowlisted. The wildcard is explicit free text for the planner, not an asserted verified Qloo entity. No tester-preference or cultural-uplift result is claimed.

## Public submission smoke

An unauthenticated browser at https://qloo-hackathon-five.vercel.app completed the normal questionnaire with Radiohead, A24 and Muji plus “I want a low-lying bed and warm lighting.” The result displayed a low platform bed and 2700 K light; **Why this room? → How it was made** identified **Live Qloo** context and adjacent artists. A subsequent “Keep everything but make the lighting warmer” refinement completed at 2400 K. This establishes an exercised public flow, not sustained availability or comparative design-quality uplift.
