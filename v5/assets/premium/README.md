# Phase 1 — approval sample, not full production

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
