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

## Asset budget

`npm run audit:assets` separates downloadable room files, fonts and uncompiled source. Current curated catalog: 25 SVG files, **9,346 bytes total**, largest **600 bytes**. Downloaded model files: **0 bytes**. Uncompiled room/catalog source is not a model-download or GPU-memory measurement. Exact runtime transfer and local loading observations are documented in README → Performance report.
