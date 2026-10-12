# Phase 1 — approval sample, not full production

## Refinement r2 (approval still pending)

The four `*-r2.webp` files replace the thin runtime silhouettes. Previous sprites are retained for `?art=phase1`; `?art=classic` retains the original SVG comparison. The art-review page shows all three at exactly 48 CSS pixels. No gameplay CSS, board surface, scene, save or core rules changed in this refinement.

Built-in image-generation edits used each previous sprite as its reference: preserve copper/silver/petrol materials and upper-left light; re-proportion for 48px; smooth broad light planes; reduce photoreal micro-detail; transparent alpha; no card/base/text. Per-object directions: double copper ribbon width and tighten its curl; shorten pliers handles 40%, thicken and separate their V, enlarge jaws/pivot; shorten wrench handle 40%, widen it 80%, enlarge jaw to nearly half its height; enlarge winch drum/housing, simplify cable to 5–6 visible turns, tuck hook and short crank close, remove tiny rails/gear detail. Runtime exports remain 192px WebP, quality 90, alpha quality 100.

Opaque silhouette area at the same 192px framing (alpha >180): copper 29.2% → 44.6%; grip 31.5% → 40.5%; spanner 23.5% → 38.9%; winch 38.9% → 59.7%. These measurements check visual mass, not enjoyment or commercial quality. Final acceptance requires actual-size screen review.

Public screenshots live in `../review/`: `before-390.webp`, `after-390.webp`, `objects-48.webp`, `original-390.webp`. They are lossless exports of real Chromium screenshots from CI run 38195296590 at gameplay commit 5f9ea401, not generated game mockups. The art-review page links to each full-size file. These review-only images are not loaded by the playable game.

Six original images generated with the built-in image-generation tool. No third-party game art or style references used. Only Fieldworks tiers 0–3, the tray material and landing scene are replaced. Later scenes and other objects intentionally retain the previous art until direction approval.

## Pipeline

Original transparent 1280px object masters → alpha-preserving 192px WebP (quality 88, alpha 100). Board → 768px WebP; scene → 1200×400 WebP. The four objects have real alpha, not baked cream cards. The live `art()` override boundary preserves semantic IDs and all gameplay interactions. `?art=classic` opts out without altering the shared save. `art-review.html` compares both sets at 48 CSS pixels.

Use the approved masters as material/camera references for later commissioned or generated assets; review silhouettes at 48px before accepting, normalize framing/light, keep transparent WebP runtime exports and separate high-resolution source masters. Do not expand the asset set until user approval. The four runtime objects are ~4× their intended display size, not full-resolution archival masters.

## Generation prompt specification

All objects: one isolated original Vaultwake collectible; premium casual art-directed 3D illustration; three-quarter overhead 35-degree camera, soft upper-left key and cool fill, strong readable forms at 48px, satin copper-orange metal, silver working edges, petrol-teal grips, restrained wear, genuine transparent background and small contact shadow. No text, logos, pedestal, card, heavy outlines or flat vector rendering.

- Copper offcut: curled thick copper strap, broad C silhouette, folded torn end, punched hole, restrained teal patina; modest raw component.
- Grip tool: sturdy locking pliers, opposing silver jaws, copper pivot/body and two dark petrol rubber handles; diagonal lower-left to upper-right.
- Split spanner: broad split silver adjustable head with worm screw, copper-orange handle, petrol leather inset and hanging hole; diagonal lower-left to upper-right.
- Pocket winch: portable copper-orange frame, cable drum, silver hook at front, right-hand petrol crank, brass gear hub, functional mounting feet; no vehicle wheels or face.
- Tray (revised after mobile screenshot review): orthographic square contemporary expedition equipment tray; clean smooth pale ivory mineral-composite centre covering 92%, barely perceptible grain, thin satin petrol-teal anodized rim with champagne chamfer, soft upper-left studio light and inner ambient occlusion. No stains, cracks, grunge, rivets, bolts, antique ornament, grid, text, objects or centre patterns. The first weathered variant was rejected because its rim and scratches competed with objects.
- Landing: panoramic coastal Saltglass Reach, ivory/apricot cliffs, turquoise tidal pools, distant lavender islands, obstructed circular bronze vault in right half, quiet sky left, calm stone foreground; no characters/UI/text. Soft sunlight, dimensional painted materials, restrained detail.

Quality gate: inspect the playable 390px view, mobile-size comparison and scene together. This sample is more materially rendered than the existing SVG set; the deliberate mixed pipeline is a prototype limitation, not a finished all-game art direction.
