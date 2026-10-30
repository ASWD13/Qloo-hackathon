# Asset sources

## Shipped assets

Room geometry and curated textures are original TasteSpace work under this repository's MIT license. No third-party furniture models, HDRIs, downloaded model weights, or commercial artworks are bundled. External font files retain their own SIL Open Font Licenses.

| Asset / files | Source / author | URL | License | Modifications |
|---|---|---|---|---|
| Fixed bedroom architecture and camera | TasteSpace contributors | `components/bedroom/Scene.tsx` | MIT | Original; architecture retained, furniture moved into separate modules |
| Five bed geometries and four frame finishes | TasteSpace contributors | `components/bedroom/assets/Bed.tsx` | MIT | Original procedural geometry |
| Seven seating families, including lounge, metal, beanbag, bench and ottoman | TasteSpace contributors | `components/bedroom/assets/Seating.tsx` | MIT | Original procedural geometry |
| Eight bedside variants | TasteSpace contributors | `components/bedroom/assets/Furniture.tsx` | MIT | Original procedural geometry |
| Five storage families and four secondary furniture families | TasteSpace contributors | `components/bedroom/assets/Storage.tsx` | MIT | Original procedural geometry |
| Ten table/mounted fixture variants and four floor-lamp families | TasteSpace contributors | `components/bedroom/assets/Lights.tsx` | MIT | Original procedural geometry |
| Eight rug presets, three size choices, six bedding presets | TasteSpace contributors | `components/bedroom/assets/Rug.tsx`, `Bed.tsx`, `lib/assets/catalog.ts` | MIT | Original geometry and material recipes |
| Ten decor objects | TasteSpace contributors | `components/bedroom/assets/Decor.tsx` | MIT | Original procedural geometry |
| Twelve square artwork textures | TasteSpace contributors | `public/textures/artwork-*.svg` | MIT | Original abstract, geometric, editorial, minimal and illustrative compositions; supersede the old artwork directory |
| Six rug textures, six bedding textures and neutral cache-miss weave | TasteSpace contributors | `public/textures/rug-*.svg`, `bedding-*.svg`, `neutral-weave.svg` | MIT | Original 512×512 SVG textile patterns |
| Barlow Condensed Bold, `public/fonts/barlow-condensed-bold.ttf` | The Barlow Project Authors | https://github.com/jpt/barlow | SIL OFL 1.1; bundled `BarlowCondensed-OFL.txt` | Self-hosted; no font-design modifications introduced by this pass |
| Manrope Regular and Semibold, `public/fonts/manrope-regular.ttf`, `manrope-semibold.ttf` | The Manrope Project Authors | https://github.com/googlefonts/manrope | SIL OFL 1.1; bundled `Manrope-OFL.txt` | Self-hosted; no font-design modifications introduced by this pass |

## Optional generated images

Generated images are runtime-only, bounded, ephemeral 512×512 textures. They are not committed or represented as curated originals. The response records the selected model and whether each surface was generated or used a curated fallback. Output use remains subject to the model/provider's applicable terms; a permissive model license is not a guarantee of copyright ownership or third-party-rights clearance.

Default model: [Black Forest Labs FLUX.2-klein-4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B), Apache-2.0 weights, through its [official free ZeroGPU Space](https://huggingface.co/spaces/black-forest-labs/FLUX.2-klein-4B). Selectable alternative: [FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell), also Apache-2.0, through its official Space. No model weights are bundled, modified or downloaded locally. HF/Space usage terms and quotas still apply to hosted generation.

Actual authenticated 512×512 images were generated, downloaded and validated through both Spaces. Generated output remains ephemeral and is not relabeled as curated artwork. Paid inference-router implementations were removed; failed or disabled synthesis uses the original local assets listed above.

Hosted image generation is optional: `HF_TOKEN` may be omitted for anonymous quota, `HF_IMAGE_MODEL` selects either supported model above, and `HF_GENERATE_TEXTURES=false` disables synthesis. Queues, quota limits and provider failures use curated local textures. No paid inference-router fallback is used.

## Runtime software and external services

The following direct runtime packages retain their upstream MIT licenses and notices. They are consumed as package distributions, not relicensed as original TasteSpace assets; exact versions and transitive packages are pinned in `package-lock.json`. Dependency license files remain in their installed packages.

| Software | Maintainer / source | License | Modifications |
|---|---|---|---|
| Next.js | [Vercel and contributors](https://github.com/vercel/next.js) | MIT | No upstream source modifications |
| React, React DOM and the `server-only` boundary marker | [React contributors](https://github.com/facebook/react) | MIT | No upstream source modifications |
| React Three Fiber and Drei | [Poimandres: Fiber](https://github.com/pmndrs/react-three-fiber), [Drei](https://github.com/pmndrs/drei) | MIT | No upstream source modifications |
| Three.js | [Three.js contributors](https://github.com/mrdoob/three.js) | MIT | No upstream source modifications |
| Motion | [Motion contributors](https://github.com/motiondivision/motion) | MIT | No upstream source modifications |
| Zod | [Colin McDonnell and contributors](https://github.com/colinhacks/zod) | MIT | No upstream source modifications |

Hosted APIs are services, not bundled open-source model weights or assets:

| Service / provider | Use | Applicable terms |
|---|---|---|
| Qloo API — Qloo | Server-side entity resolution and cross-category cultural recommendations; no Qloo images or data cache shipped | [Qloo terms](https://www.qloo.com/legal/terms-of-use) and the account/hackathon API agreement |
| Gemini API — Google | Structured design planning, review and refinement; configurable model, default `gemini-3.1-flash-lite`; no model weights bundled | [Gemini API terms](https://ai.google.dev/gemini-api/terms) and [Google APIs terms](https://developers.google.com/terms) |
| Hugging Face ZeroGPU Spaces — Hugging Face / Black Forest Labs | Optional runtime image generation using the two Apache-2.0 models listed above | [HF terms](https://huggingface.co/terms-of-service), [ZeroGPU usage](https://huggingface.co/docs/hub/en/spaces-zerogpu), and each model/Space's terms |
| Vercel — Vercel | Hosting the public Next.js application; no hosting software is bundled as project assets | [Vercel terms](https://vercel.com/legal/terms) and deployment-plan limits |

Provider credentials, account access, quota and usage rights remain the operator's responsibility. Runtime generation does not grant rights to third-party trademarks or copyrighted imagery. Artist, film and brand names are text taste references, not endorsements; no corresponding logos, album covers or film stills are bundled.

## Asset budget

`npm run audit:assets` separates downloadable room files, fonts and uncompiled source. Current curated catalog: 25 SVG files, **9,346 bytes total**, largest **600 bytes**. Downloaded model files: **0 bytes**. Geometry and curated textures ship with the source; no separate asset download or generation step is needed. These file sizes exclude framework JavaScript, GPU memory and optional runtime-generated textures.
