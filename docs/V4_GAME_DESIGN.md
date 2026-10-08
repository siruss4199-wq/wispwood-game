# Wispwood V4 — simulation-first merge game

V4 is a fresh rebuild. The board is a workspace, not the thing the player "finishes."

## Why V4 exists
Earlier versions were too linear:
1 producer → 1 chain → merge → box opens → short restoration.
That creates activity but not meaningful choice.

V4 deliberately creates competing targets:
- four simultaneous orders,
- six item chains,
- three dual-output producers,
- cobweb items worth planning around,
- limited board space + storage,
- an 18-step expedition/restoration track,
- producer and board unlock milestones.

## Item economy
Ancient Tree outputs **Leaf + Wood**.
Moon Spring outputs **Water + Crystal**.
Wisp Nest outputs **Magic + Relic**.

Each chain has 8 tiers. Producers use deterministic mixed drop cycles. Progress can never be blocked by unlucky RNG, while the board still receives varied items.

## Orders
Four active slots:
- Quick — one accessible item
- Supply — two items
- Trade — two requirements, often from different chains after new producers unlock
- Story — three requirements, higher raw merge value

Orders remain forever. The board never has an "all boxes cleared = game over" state.

## Expedition
Lost Clearing has 18 milestones. Milestones consume multiple crafted items + Coins + Forest Light.
Milestones unlock:
- more board cells,
- Moon Spring,
- Wisp Nest,
- stronger long-term targets.

## Board
8×8.
The board now starts **visually full**: every central playable cell already contains a producer or merge item, while the surrounding cells are cobweb targets or locked forest. The first decision is which matching pair to collapse to create working space.

The opening workspace deliberately contains multiple valid pairs and several high-tier singletons, so the first minute is about prioritization rather than following one forced Seed tutorial.

Several surrounding cells contain visible cobweb items.
The remaining cells are locked forest, opened in batches by expedition milestones.
Clearing every initial obstruction is not the win condition; orders and expedition continue afterward.

## Simulation gates
V4 ships with an automated heuristic simulation rather than relying only on unit tests.
The simulation must verify:
- no invalid state across 2,000+ decisions,
- orders keep regenerating,
- at least two producer families unlock in long play,
- the chapter cannot be completed in a tiny handful of merges,
- the game still has active goals after hundreds of decisions,
- all generated order requirements come from unlocked chains.

The simulation is intentionally deterministic so regressions reproduce exactly.

## Engagement polish
- Order cards show live item progress and a READY state.
- Selecting an order highlights relevant board items.
- The expedition milestone shows live crafted-item progress.
- Each unlocked producer shows its next three deterministic drops, making space and producer choices plan-able rather than opaque.
- Discovery count gives a persistent collection goal across all 48 items.
