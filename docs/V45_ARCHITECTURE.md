# Wispwood V4.5 — craft families and requests

## Audit and scope
Based on main bfe4dc5 (PR #59). V4 already had a functional pure state/engine boundary, deterministic production, 8×8 frontier, restoration, storage, Wisp Rush, Forest Parcel, collection and CrazyGames Basic Launch adapter. Its catalog used 48 emoji entries; producers differed mostly by chain pair; upgrades at levels 2 and 4 did not improve yield. Four request slots were formulaic, with "Story" merely a more expensive repeat order. App presentation and a 79 KB accumulated stylesheet mixed several design passes.

This change keeps that engine boundary and stable item/producer IDs, extracts request generation into `core/requests.mjs`, and centralizes producer output policy in the catalog. Preview and tapping share exactly one policy. No copied art, names, animation, economy tables, sound or layouts were consulted or imported. SVGs in `v4/assets` were authored as original repository-native vectors for this change.

## Families and producers
| Board workshop | Craft families | Forms |
| --- | --- | --- |
| Rootfold Nursery | Canopy Weaving, Rootwright Craft | Seed Cradle → Rootfold Nursery → Canopy Workshop |
| Dewwheel Cistern | Dewglass, Echo Stone | Reed Collector → Dewwheel Cistern → Rain Choir Works |
| Gloamthread Loom | Gloamthread, Memory Imprints | Thread Basket → Gloamthread Loom → Memory Weavery |

Each family contains ten named steps: material → worked craft → forest installation. Sixty local vector assets use six palettes and family silhouettes. Nine workshop assets express three independent forms. Forms advance every four restoration milestones after that producer unlocks. Guaranteed special outputs occur every 16/14/12 taps by form, at tiers 3/4/5 before upgrade bonuses; they belong to the secondary family, never to an inaccessible extra chain. All five upgrade levels affect yield: odd levels raise the baseline, even levels improve every fourth output. No random drought or cooldown was introduced.

The opening full workspace, chains and inventory IDs are preserved. Tier 10 is terminal. Late commissions use tier 9; the final restoration uses tier 10. Collection totals are derived from the catalog.

## Requests
Two accessible neighbour/supply slots, a visiting request slot, and a multi-item keeper commission. Four residents have their own role and purpose. The restoration track remains the separate persistent story goal. After six deliveries, occasional visiting requests offer a fifteen-minute coin bonus. Expiry removes only the bonus; base rewards and items remain available. Completion reads the current deadline, not the displayed timer. Serialized deadlines do not restart on reload. This is a local, noncompetitive clock, not a secure server economy.

Quantities are normalized at generation. Readiness also aggregates duplicate requirements defensively, preventing double spending of a single item. Every third delivery continues to award Forest Parcel. Wisp Rush is unchanged.

## Save compatibility
Schema 3 accepts schema 2. Board, backpack, balances, upgrade levels, tap counts, completed milestones, discovery keys, active requirements and rewards survive migration. Existing requests gain resident metadata and remain untimed. New requests use V4.5 generation. The storage key remains `wispwood-v4`.

## Presentation and integration
Both entry pages load the same `craft.css` surface and original SVGs. Board, request ingredients, previews, backpack and book share one art helper. A compact active request and restoration strip replace the duplicate activity shelf; the 8×8 board remains primary. Request navigation stays accessible. Existing synthesized audio and Basic Launch SDK behavior are preserved; no ads or external art requests are added.

`craft.css` isolates this presentation from the accumulated stylesheet. Removing obsolete CSS and hidden legacy markup is a follow-up; this pass deliberately avoids rewriting unrelated effects and panel behavior at the same time as the economy.

## Verification and remaining release work
Run `node --test tests/game.test.cjs tests/*-core.test.mjs tests/v4-simulation.test.mjs tests/v4-crazygames.test.mjs` and syntax checks. V4.5 tests cover all producer/form/level combinations, all assets, cap merges, migration, duplicate consumption, bonus expiry/replay and request reachability. Existing 2,400-decision heuristic simulation remains enabled.

CI additionally installs Playwright and runs `tests/v45-browser.cjs` at 360, 390 and 768 px, checking errors, missing images, overflow, board fit, taps, drag merging, producer use, panels and persistence; screenshots are uploaded. Local visual QA could not run because the environment lacked Chromium and its browser download was truncated. Do not treat the first asset direction as final commercial art approval or the heuristic simulation as a retention/balance study. On-device art readability and long-session economy tuning remain review gates.
