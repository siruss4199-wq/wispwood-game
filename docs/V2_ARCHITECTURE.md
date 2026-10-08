# Wispwood V2 — Merge + Economy + Restoration Architecture

## Player promise
Every merge should visibly move the player toward restoring Wispwood. Coins are not a score. Crafted items are not disposable clutter. Both are resources the player spends to change the world.

## Core loop
Producer → merge items → complete Forest Orders → earn Coins + Forest Light → craft restoration item → spend Coins + item → visibly restore the area → unlock story/next area.

## Three resources only
- Energy: pays for producer taps.
- Coins: earned from Forest Orders and spent on restoration projects.
- Forest Light: earned from Orders and acts as a story/restoration threshold. It is not consumed.
- Crafted items: high-value project materials; the selected required item is consumed when a project is restored.

## Lost Clearing story
Four projects create the first complete chapter:
1. Wake the Garden — 40 Coins + Herb + 3 Light.
2. Repair the Bridge — 90 Coins + Bloom + 8 Light.
3. Light the Lanterns — 150 Coins + Moon Flower + 15 Light.
4. Restore Mivra's Shelter — 240 Coins + Ancient Blossom + 25 Light.

Each project adds 25% to the area. Completing the fourth reaches 100%, rescues Mivra, and unlocks Moonlit Grove.

## Feedback hierarchy
Immediate: merge animation / item tier increases.
Session goal: order reward shows Coins + Light gained.
Medium goal: restoration card shows exact Coin/Light/item requirement and 0–100% area progress.
Major goal: project completion changes the restoration visual and reports 25/50/75/100%.
Chapter goal: 100% Lost Clearing → Mivra rescued → Moonlit Grove unlocked.

## Structural rules
- Board remains 8×8.
- Start remains 62 crates + 2 Seeds.
- First merge reveals Ancient Tree and an empty tile.
- Every normal merge opens another frontier crate while crates remain.
- When no merge pair exists, producer capacity is preserved.
- Orders continue even after an area is complete.
- Core engine owns rules; UI only dispatches actions and renders state.

## Next expansion
Moonlit Grove should introduce Dew + Moon Spring only after this first-area economy feels good. Do not add more currencies before the Coin/Light/restoration loop is proven.
