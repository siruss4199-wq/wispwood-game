# Wispwood V2 — Clean Merge Architecture

## Why rebuild
The old prototype mixed UI, merge rules, progression, migrations, crate logic and CSS-sensitive tests in one file. V2 is split into catalog, state, engine, UI and behavior tests.

## Non-negotiable core rules
1. Drag identical items together to merge.
2. Start with one chain only: Leaf.
3. Ancient Tree is the deterministic Seed source and costs 1 Energy per tap.
4. Board starts visually full: 62 crates + 2 Seeds.
5. First Seed merge reveals the Tree plus one empty tile.
6. Every later merge opens one additional empty frontier crate.
7. Merges recover 1 Energy, so crafting cannot quietly consume the player into a hard stop.
8. When no pair exists, the engine must preserve a producer plus at least two open spaces while crates remain.
9. Core engine never reads or writes the DOM.
10. Behavior tests simulate full progression and long-run liveness.

## Continuous chapter flow
Chapter One is no longer a one-quest demo:
- Healing Herb (tier 2)
- Forest Bloom (tier 3)
- Moon Flower (tier 4)
- Completing all three rescues Mivra.
- After rescue, rotating Forest Orders continue indefinitely so the game does not hit a content wall.

## State model
Each cell owns:
- terrain: crate | open
- reveal: future crate content
- content: null | item | producer

Game-wide state owns:
- Energy
- Moves
- Chapter quest index/history
- Rescue state
- Endless order index/count
- Save schema

## Tests
The V2 test suite covers:
- full-board two-Seed start
- first merge reveal
- producer/energy loop
- all 3 chapter requests
- post-rescue endless orders
- 120 automated actions without a dead end
- save schema validation

Next expansion only after this loop feels good:
- Mivra scene/reward presentation
- Dew chain
- vine blockers
- second producer
- economy/ads/events later
