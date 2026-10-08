# Wispwood V2 — Clean Merge Architecture

## Why rebuild
The current prototype has UI, merge rules, progression, migrations, crate logic and tests coupled inside one large file. V2 keeps the current live game intact and rebuilds the merge loop separately under /v2.

## Product rules
1. Drag identical items together to merge.
2. Start with one chain only: Leaf.
3. Ancient Tree is the deterministic source of Seeds and costs 1 Energy per tap.
4. The board starts visually full: 62 crates + 2 visible Seeds.
5. The first Seed merge reveals the Ancient Tree plus one empty space.
6. Every later merge opens one additional empty frontier crate.
7. Deadlock prevention is structural: when no pair exists, the player must have a producer and at least two empty open cells. Do not inject a random “matching” rescue item.
8. New chains unlock only after the previous loop is understood.
9. Core rules never touch the DOM.
10. Tests assert gameplay behavior, not exact CSS strings.

## Deterministic onboarding
- Seed + Seed -> Sprout.
- Reveal Ancient Tree + one empty tile.
- Tap Tree twice -> two Seeds.
- Seed + Seed -> Sprout + one new empty tile.
- Sprout + Sprout -> Herb + one new empty tile.
- Deliver Herb -> first quest complete.

## Structure
```
v2/
  index.html
  style.css
  app.mjs
  core/
    catalog.mjs
    state.mjs
    engine.mjs
tests/
  v2-core.test.mjs
```

Each board cell owns its own state:
- terrain: crate | open
- reveal: future content while closed
- content: null | item | producer

This replaces parallel arrays that can drift out of sync.

## Expansion sequence
Foundation: Leaf chain, Tree producer, first Herb quest, drag merge, energy, deterministic crate opening.
Chapter 1: 3 Leaf quests + Mivra rescue.
Chapter 2: Dew producer + vines/cobwebs.
Chapter 3: Glow producer + companion abilities.
Economy/ads/events only after the base loop is stable.
