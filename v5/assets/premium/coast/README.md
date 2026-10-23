# Coast Camp rendered art (build 27)

The user asked for icons "on a par" with the painted Fieldworks parts; no image-generation
tool was available, so these are real 3D renders made here: a ray-marched signed-distance
scene in WebGL (`render.html`), soft upper-left key light, sky and bounce fill, soft
shadows, ambient occlusion, specular and a darkened rim, with a contact shadow on a
transparent background.

Render: serve nothing, just run from this folder
`NODE_OPTIONS=... node render-shot.cjs barrel crate chest bundle basket opencrate trunk token cog`
(Playwright Chromium, `--use-gl=swiftshader`), then crop to the alpha box plus 8 %, and
export 192 px WebP (quality 88, alpha 100) with the names below.

| File | Object |
|---|---|
| cargo-crate, cargo-bundle, cargo-barrel, cargo-basket | sealed cargo (Rover, Kite, Rope Winch, later chains) |
| driftwood-crate, sea-chest, captains-trunk | crates, sizes 1–3 |
| tide-token, brass-cog | Tide token, Brass cog |

Painted art from `docs/V5_COAST_ART_BRIEF_2026-10-23.md` can replace any file with the same name.
