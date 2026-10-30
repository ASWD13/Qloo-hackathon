# TasteSpace

Cultural taste → documented Qloo context → validated design proposal → bounded review → deterministic room tools → editable 3D bedroom.

## Local development

Node.js 22+, npm. Run `npm ci`, copy `.env.example` to `.env`, fill in your server-side API keys, then run `npm run dev`. Open http://127.0.0.1:3000. **View example** works without credentials through the shared room pipeline. `USE_MOCK_AI=true` is an explicit developer fixture switch, never a silent fallback for a failed live request.

## Repository layout

- `app/` — Next.js pages, server API routes, and global styling.
- `components/` — questionnaire, studio controls, and interactive bedroom.
- `lib/` — Qloo/Gemini adapters, planning, room tools, asset catalog, and optional image generation.
- `public/` — curated artwork, textures, fonts, and bundled licenses.
- `scripts/` — reproducible provider checks, asset audits, and benchmarks.
- `tests/` — deterministic room, planner, provider-boundary, and image-fallback tests.
- `ASSET_SOURCES.md`, `QLOO_CAPABILITIES.md` — licensing and provider capability documentation.

Keep credentials in `.env` locally and private environment variables on your hosting platform. `.gitignore` and `.vercelignore` exclude real environment files, generated output, local AI tooling, and private implementation notes; `.env.example` is the only environment template intended for Git. Application source, tests, assets, and reproducible scripts remain part of the submission. No agent tooling is required to run the app.

## API setup

- Qloo: follow [official onboarding](https://docs.qloo.com/reference/api-onboarding), which directs developers to `support@qloo.com` for a key. Set `QLOO_API_KEY` and the HTTPS base URL assigned to your account (current production OpenAPI: `https://api.qloo.com`). Exact capabilities and live-verification gaps: `QLOO_CAPABILITIES.md`.
- Gemini: create a server API key at https://aistudio.google.com/apikey. Set `GEMINI_API_KEY`.
- Add keys only to `.env` or Vercel environment variables, never source code or chat. Set `USE_MOCK_AI=false` for live operation. Never prefix credentials with `NEXT_PUBLIC_`. If a credential has been shared or committed, revoke/rotate it; ignoring a file does not remove secrets from existing Git history.
- Optional original artwork/textiles use free HF ZeroGPU Spaces, defaulting to `HF_IMAGE_MODEL=black-forest-labs/FLUX.2-klein-4B`. `HF_TOKEN` is optional and server-only; an empty token uses anonymous quota. Set `HF_GENERATE_TEXTURES=false` to skip synthesis entirely. Failures use curated local textures, never abort room completion. No paid inference-router fallback.

## Checks

`npm run typecheck`, `npm test`, `npm run build`. Asset provenance: `ASSET_SOURCES.md`. Provider coverage and limitations: `QLOO_CAPABILITIES.md`.

`npm run audit:assets` reports original asset sizes. `npm run inspect:qloo` makes real requests for all four showcase profiles when a key is configured; it exits nonzero for unavailable cultural context. Account-specific live evidence is recorded in `QLOO_CAPABILITIES.md`. Gemini defaults to the tested `gemini-3.1-flash-lite`; override `GEMINI_MODEL` for a model available to your account. The previous `gemini-2.5-flash` returned 404 for these credentials. See [available models](https://ai.google.dev/gemini-api/docs/models) and [pricing](https://ai.google.dev/gemini-api/docs/pricing); limits and data-use terms are provider/account-specific.

## Using the studio

Select **Design my bedroom** for four focused questions: music, visual worlds, brands, and an optional wildcard. The questionnaire has no room preview. Select up to three per category, filter the suggestions, or add your own. Enter/Add saves a custom pick; Continue also saves a typed entry and advances an optional empty question. Back preserves selections; the final review includes **How adventurous should we get?** and one **Create my room** action. Manual selection requests live providers unless the developer explicitly enabled fixtures. **View example** opens a curated room through the same validated tools and progressive rendering. **Other example rooms** exposes all four profiles, and **Make your own** opens the questionnaire with those tastes.

The exploration slider adjusts the fraction of returned cultural discoveries included in the prompt, plus design exploration preference. It is not a Qloo distance/similarity percentage. Select **Redesign with this exploration** to apply it.

The result leads with the interactive room, concept, palette and compact furniture/material/lighting choices. **Refine room** opens a focused editor; suggestions fill the draft without spending a request. Select **Update room** or press Enter to apply; Cancel/Escape closes the form and returns focus. Examples and live planning support lower beds, chair replacement/removal, reading-corner placement, no rug, storage, material exclusions and controlled exploration. Named edits preserve unrelated state; broad instructions may change a wider, validated subset. Undo/redo restore complete design transactions, including locks, with 20 transactions held in session memory.

Comparison creates two fresh plans from the same neutral bedroom using the same catalog, tools, model and temperature. Only cultural context differs. It never compares an already-refined room with an untouched generic room. Mock comparison is illustrative, not measured evidence of Qloo quality uplift. No tester preferences or evaluation results have been manufactured.

**Why this room?**, **What changed?**, **Keep parts unchanged**, **Compare with generic AI**, and **Adjust your taste** start collapsed. Full cultural provenance, design notes and technical evidence remain inspectable under the relevant disclosures. Comparison puts **Taste only** / **Taste + cultural context** beside the room metadata, with **Back to my room** restoring the editable design. **Start over** lives in the top navigation. Rotate/zoom guidance and **Reset view** share one control bar; the guidance fades after interaction.

## Interior-design agent contract

- **Geometry, not just finishes:** five bed types (`platform_low`, `upholstered`, `wood_frame`, `metal_frame`, `floating_platform`), seven seating choices, eight bedside variants, five storage families, four secondary furniture families, ten table/mounted fixture variants, four floor-lamp families, eight rug presets with three sizes, twelve artworks and ten decor choices. Optional furniture, rugs and art support `none`.
- **One visual language:** original procedural geometry at consistent scale. No third-party model downloads or compression decoders are required. Mesh/material pools are shared; selected category modules load lazily. Texture references are refcounted and released on deselection.
- **Safe movement:** `move_furniture(slot, placement_id)`, never arbitrary XYZ. Bed: `back_center`, `back_left`, `back_right`; chair: `window_reading`, `front_right`, `front_left`; secondary desk/table/bench: `right_wall`, `front_left`, `under_window`; floor lamp: `window_side`, `front_right`; storage: `back_left`, `right_wall`, `front_right`. Legal IDs do not guarantee a legal combination: footprint, boundary, door-clearance, wall-mount and support-surface checks gate the entire batch. Bedside surfaces follow the bed. A right-shifted bed may require removing the right bedside unit to clear the door.
- **Real instruction channel:** wildcard text feeds design intent, materials, exclusions, geometry and layout—not Qloo search. Common explicit preservation/exclusion phrases are parsed into `{locked, forbidden, preferences}`. Existing constraints and source-grounded explicit requests are authoritative; a model cannot invent permanent locks or exclusions. More general aesthetic interpretation remains Gemini's job.
- Gemini-derived locks/exclusions also require matching preservation/negative language for the relevant category in the user's instruction. Unrelated model-added restrictions are rejected rather than silently turning a reading-corner request into a “no floor furniture” room.
- **Plan before tools:** Gemini returns concept, `designIntent`, constraints, full validated `assetSelections`, `placements`, wall/lighting/decor `surfaces`, explanations and optional `generatedTextureRequests`. The server compiles that proposal into deterministic tools, avoiding two inconsistent model-written copies of the same choices. Strict schemas reject unknown IDs, extra fields and unsafe references. Invalid proposals get the existing single bounded repair.
- **One critique maximum:** inspect balance, repetition, colors, crowding, constraints and too-literal cultural translation. At most three review tools; no protection or texture changes. Invalid/unavailable review changes are discarded while the validated initial design survives. Execution evidence includes review status and applied change count.
- **Minimal refinements:** “Make the bed lower; keep everything else” changes bed geometry only. “Keep everything but make the lighting warmer” changes temperature only. Experimental edits use more of the returned Qloo discoveries and affect at most three art/textile/decor surfaces, not the furniture layout. Replacing art/textiles clears obsolete custom maps unless a new texture is explicitly applied.
- **Locks:** **Room locks** exposes bed, walls, layout, seating, artwork, rug and lighting. AI tools cannot remove a lock or an existing exclusion. Explicit user lock/unlock is a local authorized transaction; refinement and exploration redesign carry the current protected state. Locks survive undo/redo within the session, not page reloads.
- **Atomic layouts:** progressive previews accumulate dependent tool calls until a safe intermediate room can be displayed. No transient chair/bed collision or orphaned bedside object is rendered.

`/engine` exposes every catalog selection, placement, color, lighting parameter and safe texture reference for manual inspection. Invalid tool batches retain the previous state and report their clearance/protection issue.

## Optional Hugging Face textures

`lib/huggingface/imageClient.ts` implements the swappable `ImageGenerator` through official, quota-limited **ZeroGPU Spaces**, not the billed Inference Providers router. The supported model IDs map to fixed HTTPS origins and explicit Gradio input contracts; arbitrary endpoints are rejected. No generated 3D geometry, local model download or new Python worker is required.

| Model / official Space | License | Observed authenticated generation + download + validation |
|---|---|---|
| [FLUX.2-klein-4B](https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B) — default | Apache-2.0 weights | 6.718 s; 512×512 WebP, 7,800 bytes |
| [FLUX.1-schnell](https://huggingface.co/spaces/black-forest-labs/FLUX.1-schnell) — selectable alternative | Apache-2.0 weights | 2.350 s; 512×512 WebP, 6,994 bytes |

These are individual successful observations, not throughput, quality or reliability guarantees. An earlier anonymous Schnell response pointed to an inaccessible file; downloading and validating the image is mandatory before reporting success.

### Free quota and configuration

[HF ZeroGPU](https://huggingface.co/docs/hub/en/spaces-zerogpu#usage-tiers) currently includes two GPU minutes/day anonymously or five minutes/day for a free account. `HF_TOKEN` uses that account's quota; leave it empty for anonymous use. Quota is shared across the application's requests, not renewed for every visitor. PRO accounts with existing prepaid credits can incur ZeroGPU overage under HF's rules; use a free account or anonymous access to stay on the free allocation. TasteSpace never switches to a paid router or buys credits.

Set `HF_IMAGE_MODEL` to either supported ID above. `HF_GENERATE_TEXTURES=false` disables only image synthesis: the design still uses its planned furniture, materials and matching curated maps. The old `HF_IMAGE_PROVIDER` setting and paid-router implementations have been removed.

### Completion and safety

- A fully validated room exists before optional textures are requested. Each surface succeeds or falls back independently; one failed image does not discard successful images or the room.
- Quota errors, HTTP 402/429/5xx, Space errors, timeouts, unsafe URLs, inaccessible files and invalid image data use the plan's allowlisted curated fallback. Rugs, bedding and artwork remain present unless the user requested their removal.
- One 18-second deadline covers queue wait, submission, streamed result and image download. At most two calls run concurrently and six wait; saturated queues immediately use curated assets. No retry loop or secondary paid-provider call.
- An HTTP-200 queue acknowledgement is not an image. The adapter consumes complete/error SSE events, bounds metadata, and downloads only from the selected official Space's file route. Redirects and cross-origin URLs are rejected, so credentials cannot follow an image URL elsewhere.
- Images must be valid-signature PNG/JPEG/WebP, exactly 512×512, at most 2 MiB. Only curated paths or opaque `/api/textures/<sha256>` IDs reach the renderer.
- Generated cache: 32 entries, 16 MiB, one-hour TTL. Eviction, restart or another serverless instance serves a local neutral weave; client fetch failures retain the selected curated category. Neither failure removes room geometry.

Run `NODE_OPTIONS=--conditions=react-server npx tsx --env-file-if-exists=.env scripts/evaluate-image-models.ts`; use `--no-token` for anonymous quota or `--model=<owner/repo>` for one supported candidate. This evaluation calls the same free adapter as the application. Setup follows the official [Spaces API](https://huggingface.co/docs/hub/spaces-api-endpoints); licensing is recorded in `ASSET_SOURCES.md`.

## Presentation system

The existing presentation system is retained. This pass expands room and agent capability, with only compact questionnaire/search cleanup and simple room-lock controls; it is not the final UI redesign.

- Tokens and responsive layouts: `app/globals.css`; focused controls use CSS Modules. Page maximum 1440px, fluid 20–64px gutters, 8px spacing rhythm, 1px structural borders and 2px key rules.
- Palette: bone `#f4f2eb`, charcoal `#242720`, muted `#62665b`, border `#c5c7bb`, room-stage sage `#e4e4d8`, citron `#d8ed68`. Citron is a selection/action signal, not low-contrast body text.
- Two self-hosted voices: Barlow Condensed Bold for editorial display, Manrope Regular/Semibold for functional text. Font files and their SIL Open Font Licenses are in `public/fonts/`; no runtime font-provider request.
- Primary actions are 56px, other controls at least 44px. Native inputs/buttons, pressed/expanded states, visible focus, focus restoration and mobile sticky questionnaire actions remain accessible.
- Free `motion/react`: 180ms transitions, short presence changes, layout changes for selection chips/disclosures, restrained 0.98 tap feedback; physical taps use stiffness 450 / damping 32. `MotionConfig reducedMotion="user"` plus explicit reduced-motion handling suppresses movement and disclosure delays.
- The Next.js development indicator is hidden so it cannot cover mobile Back/Continue controls; compiler/runtime errors remain visible. No paid Motion+ package was installed.

UI verification exercised fresh desktop/mobile sessions, live generation and lighting-only live refinement, exact undo/redo, live paired comparison, all four examples, rug-only example refinement, custom-pick limits and keyboard entry, review validation, exploration redesign, source disclosures, reduced motion, and injected network-failure recovery. Layouts were checked from 320px mobile through 1440px desktop; production build and the existing contract suite remain part of local verification.


## Reliability and performance

- `/?demo=true` remains a supported deep link to the curated Quiet Experimental inspiration. The consumer interface has no technical mode selector or exit-mode requirement.
- 3D renders on demand, caps device pixel ratio at 1.5, and loads only selected category geometry/textures. Shared primitive/material pools avoid duplicate resources; texture references are released on deselection. No all-catalog preload.
- Provider failure preserves the last complete room transaction and offers a retry of the exact failed action. Qloo continues with a valid subset, but a complete search-provider failure is explicit; successful no-match searches can plan from stated taste with honest attribution. No invented or mislabeled cached data.
- Provider calls retry once for transient network/timeout, 408, 429 and 5xx failures. Gemini receives the tagged manifest and a provider-compatible proposal schema; strict local bounds, constraints and layout checks gate deterministic tool compilation. Invalid proposals get one guided repair, never arbitrary ID remapping. Review and generated-texture failures do not replace a valid initial design.
- Errors carry stage, provider, status, code and readable recovery guidance. Development additionally logs safe issue paths/codes and offers a diagnostic disclosure; raw provider bodies, headers, keys and user text are not logged. Streaming routes return NDJSON error frames after HTTP headers have been sent; the frame’s `error.status` is the upstream status, not an HTTP-200 success claim.
- Motion is limited to questionnaire progress, selection feedback, status changes, palettes, disclosures, and room-related layout transitions; reduced-motion preferences disable transforms/tool delays. The renderer remains demand-driven.
- WebGL failure is contained inside the canvas; design details/refinement remain available. **Retry 3D view** remounts the renderer. Individual texture failures use local fallback maps without collapsing the canvas.
- Inputs require JSON, same-origin browser requests, ≤16 KiB bodies, bounded taste text, valid allowlisted tools and lighting. Cross-origin browser requests are rejected. This is not distributed abuse prevention: enable Vercel Firewall/rate rules before exposing credentialed APIs to unrestricted traffic.
- No accounts, database, persistence service or Python backend. Hugging Face is optional, not a room-completion dependency. Undo history and locks are session memory and reset on reload.
- `npm run benchmark` measures explicitly mocked HTTP/server timings. Set `APP_URL` to another deployment; `BENCHMARK_LIVE=true` deliberately invokes live providers. Never quote mock timings as live latency.

## Performance report

Measured in local production Chromium at 1440×1000, cache disabled, no generation requests during the initial-load measurement. Encoded body sizes are payload observations, not a mobile-bandwidth/FPS guarantee.

| Measure | Observed |
|---|---:|
| Initial page + scene resources, including HTML, scripts, fonts, CSS and selected textures | 633,564 bytes |
| Initial JavaScript | 493,945 bytes |
| Initial scene texture payload, three selected maps | 1,070 bytes |
| Entire curated texture catalog, 25 files | 9,346 bytes |
| Largest curated texture | 600 bytes |
| Downloaded GLB/model payload; largest model | 0 bytes; none |
| Largest initial compressed JavaScript chunk | 137,538 bytes |
| Mean local selected-texture request duration, three samples | 2.5 ms |
| WebGL draw calls over a settled 600 ms interval | 0 |

The full static catalog has 89 non-`none` entries including material and size variants, not 89 heavyweight models. Browser workbench exercised 83 selections across eleven geometry/fixture/rug/art categories with no runtime errors. Large fixed costs are Three.js/React, not furniture downloads. Procedural reuse, selected-only lazy modules and 512-square maps avoid model payload outliers; obsolete artwork files were removed. Generated textures remain bounded separately and are not part of the static catalog total. Run `npm run audit:assets` for separated source/texture/font figures; uncompiled source bytes are not transfer or GPU-memory figures.


## Vercel deployment

1. Import this repository at https://vercel.com/new (Next.js; Node 22.x; `npm ci`; `npm run build`).
2. For a credential-free development preview, set `USE_MOCK_AI=true`; seeded provenance stays available in the explanation. Public inspiration links also work without that switch.
3. For live mode, configure `QLOO_API_KEY`, your assigned `QLOO_API_BASE_URL`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL`; set `USE_MOCK_AI=false`. These are server variables, never `NEXT_PUBLIC_*`.
4. Deploy. Visit `/api/health`, open `/?demo=true` in a fresh browser, and exercise live generation, warm refinement, undo/redo and comparison.
5. CLI alternative after authentication: `npx vercel login`, then `npx vercel deploy --prod`. API routes allow 180 seconds and the browser allows 185 seconds to accommodate bounded provider retries/plan repair; verify the target hosting plan permits that duration.

Deploy with an authenticated Vercel account or a connected Git project and private server environment variables. Local `.env` files are not included in deployment uploads.

## Code boundaries

| Layer | Entry points | Responsibility |
|---|---|---|
| Cultural data | `lib/qloo/adapter.ts` | Documented search/insights requests, conservative entity matching, provenance and missing-context reporting |
| Design reasoning | `lib/gemini/adapter.ts`, `lib/agent/plan.ts`, `planning.ts` | Structured proposals, grounded constraints, deterministic tool compilation and one bounded critique; explicit no-key fixtures |
| Server orchestration | `lib/agent/orchestrate.ts`, `app/api/` | Private credentials, cultural enrichment, planning and atomic validation |
| Deterministic execution | `lib/room/state.ts`, `tools.ts`, `anchors.ts`, `constraints.ts`, `history.ts` | Tagged catalog, safe anchors, collision checks, protection invariants and transaction history |
| Presentation | `components/bedroom/`, `components/studio/` | Fixed architecture, selected lightweight geometries/textures, safe progressive previews, locks and source-separated evidence |

Successful free-Space image generation has been observed; public deployment, sustained-provider reliability and tester-preference results are not claimed.
